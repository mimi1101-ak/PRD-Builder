import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, ndjsonResponse } from "@/lib/ndjson";
import { generateDocument } from "@/lib/ai/documents";
import { describeAiError } from "@/lib/ai/client";
import { loadCredits, loadDocuments, loadMessages } from "@/lib/projects";
import { FREE_PRD_PER_ACCOUNT, normalizeCoverage, normalizeSummary, type DocKind } from "@/lib/domain";

// 문서는 상위 모델로 길게 쓰므로 넉넉히
export const maxDuration = 300;

const GenerateSchema = z.object({
  projectId: z.string(),
  kind: z.enum(["prd", "tasks", "claude_md"]),
});

// 문서 만들기 (PRD 7장 ②)
// - PRD: 무료, 계정당 3개까지 (다 쓰면 더 만들 수 없음)
// - 작업 단계·CLAUDE.md: 잠금 해제된 프로젝트만. 처음 열 때(작업 단계 생성 성공 시점)에 크레딧 1 차감
// - 실패한 생성은 횟수·크레딧을 차감하지 않는다
async function handlePOST(request: Request) {
  const parsed = GenerateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "잘못된 요청이에요.");
  const { projectId, kind } = parsed.data;

  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "문서를 만들려면 로그인이 필요해요.", "login_required");
  const userId = viewer.userId;

  const project = await getProjectForViewer(projectId, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.");
  if (project.status === "interviewing") {
    return jsonError(409, "아이디어 대화의 최종 확인을 먼저 마쳐 주세요.", "not_ready");
  }

  const docs = await loadDocuments(project.id);
  const existing = docs[kind];
  if (existing?.status === "ready" && existing.content) {
    return jsonError(409, "이미 만들어진 문서예요.", "exists");
  }

  const prd = docs.prd?.status === "ready" ? docs.prd.content : "";
  if (kind !== "prd") {
    if (!prd) return jsonError(409, "PRD를 먼저 만들어 주세요.", "need_prd");
    if (!project.unlocked && (await loadCredits(userId)) < 1) {
      return jsonError(402, "크레딧이 필요해요.", "no_credit");
    }
  }

  const admin = createAdminClient();

  // 같은 문서를 동시에 두 번 만들지 않게 잠근다 (새로고침·여러 창)
  const { data: locked, error: lockError } = await admin.rpc("start_document_generation", {
    p_project_id: project.id,
    p_kind: kind,
  });
  if (lockError) {
    console.error("[documents] lock failed", lockError);
    return jsonError(500, "문서 생성을 시작하지 못했어요. 다시 시도해 주세요.");
  }
  if (!locked) return jsonError(409, "다른 창에서 이 문서를 만드는 중이에요.", "generating");

  const markFailed = () =>
    admin
      .from("documents")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("project_id", project.id)
      .eq("kind", kind);

  if (kind === "prd") {
    const { data: allowed } = await admin.rpc("consume_free_generation", {
      p_user_id: userId,
      p_limit: FREE_PRD_PER_ACCOUNT,
    });
    if (!allowed) {
      await markFailed();
      return jsonError(
        429,
        `무료로 만들 수 있는 PRD ${FREE_PRD_PER_ACCOUNT}개를 모두 만들었어요. 만든 PRD는 내 프로젝트에서 언제든 다시 볼 수 있어요.`,
        "free_limit",
      );
    }
  }

  const messages = await loadMessages(project.id);
  const input = {
    idea: project.idea,
    tool: project.tool,
    experience: project.experience,
    coverage: normalizeCoverage(project.coverage),
    summary: normalizeSummary(project.summary),
    messages,
    prd,
  };

  return ndjsonResponse(async (send) => {
    let content: string;
    try {
      content = await generateDocument(kind as DocKind, input, (delta) => send({ type: "text", delta }));
    } catch (err) {
      console.error(`[documents] ${kind} failed`, err);
      await markFailed();
      if (kind === "prd") await admin.rpc("refund_free_generation", { p_user_id: userId });
      const { message, retryable } = describeAiError(err);
      send({ type: "error", message, retryable });
      return;
    }

    // 작업 단계를 처음 연 순간 크레딧 1 차감 + 잠금 해제 (이미 해제됐으면 차감 없음)
    let unlocked = project.unlocked;
    if (kind !== "prd" && !unlocked) {
      const { data: result, error } = await admin.rpc("unlock_project", {
        p_project_id: project.id,
        p_user_id: userId,
      });
      if (error || (result !== "unlocked" && result !== "already")) {
        await markFailed();
        send({
          type: "error",
          message:
            result === "no_credit" ? "크레딧이 부족해요. 충전 후 다시 시도해 주세요." : "잠금 해제에 실패했어요.",
          code: result === "no_credit" ? "no_credit" : undefined,
          retryable: false,
        });
        return;
      }
      unlocked = true;
    }

    const now = new Date().toISOString();
    const { data: saved, error: saveError } = await admin
      .from("documents")
      .update({ content, status: "ready", updated_at: now })
      .eq("project_id", project.id)
      .eq("kind", kind)
      .select("kind, status, content, rewrite_count")
      .single();
    if (saveError || !saved) {
      console.error("[documents] save failed", saveError);
      await markFailed();
      send({ type: "error", message: "문서를 저장하지 못했어요. 다시 시도해 주세요.", retryable: true });
      return;
    }

    if (kind === "prd") {
      await admin.from("projects").update({ status: "done", updated_at: now }).eq("id", project.id);
    }

    send({
      type: "done",
      document: {
        kind: saved.kind,
        status: saved.status,
        content: saved.content,
        rewriteCount: saved.rewrite_count,
      },
      unlocked,
      credits: await loadCredits(userId),
    });
  });
}

export const POST = withErrors(handlePOST);
