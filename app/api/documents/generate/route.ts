import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, ndjsonResponse } from "@/lib/ndjson";
import { generateDocument } from "@/lib/ai/documents";
import { describeAiError } from "@/lib/ai/client";
import { checkTasks } from "@/lib/doc-check";
import { loadCredits, loadDocuments, loadMessages, prdOpen } from "@/lib/projects";
import { isAdmin } from "@/lib/admin";
import { splitPrdPreview, streamingPrdPreview } from "@/lib/markdown";
import { PRD_PREVIEW_SECTIONS, normalizeCoverage, normalizeSummary, type DocKind } from "@/lib/domain";

// 문서는 상위 모델로 길게 쓰므로 넉넉히
export const maxDuration = 300;

const GenerateSchema = z.object({
  projectId: z.string(),
  kind: z.enum(["prd", "tasks", "claude_md"]),
});

// 문서 만들기 (PRD 7장 ②)
// - PRD: 무료, 개수 제한 없음. 전체를 만들어 저장하고, 잠금 해제 전에는 앞 장만 브라우저로 보낸다
// - 작업 단계·CLAUDE.md: 처음 열 때(첫 유료 문서 생성 성공 시점)에 크레딧 1 차감 + 잠금 해제 → PRD 나머지도 열린다
// - 실패한 생성은 크레딧을 차감하지 않는다
// - 개발자 계정은 잠금 해제 때 크레딧이 차감되지 않는다 (unlock_project 안에서 처리)
async function handlePOST(request: Request) {
  const parsed = GenerateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "잘못된 요청이에요.");
  const { projectId, kind } = parsed.data;

  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "문서를 만들려면 로그인이 필요해요.", "login_required");
  const userId = viewer.userId;
  const isDeveloper = await isAdmin(userId);

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
    if (!project.unlocked && !isDeveloper && (await loadCredits(userId)) < 1) {
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

  const messages = await loadMessages(project.id);
  // TASKS 는 먼저 만든 CLAUDE.md 를 받아 폴더 구조·명령을 맞춘다 (화면은 PRD → CLAUDE.md → TASKS 순서로 만든다)
  const claudeMd = docs.claude_md?.status === "ready" ? docs.claude_md.content : "";
  const input = {
    idea: project.idea,
    tool: project.tool,
    experience: project.experience,
    coverage: normalizeCoverage(project.coverage),
    summary: normalizeSummary(project.summary),
    messages,
    prd,
    claudeMd,
  };

  // 잠금 해제 전 PRD 는 만드는 중에도 앞 장까지만 보낸다
  const previewOnly = kind === "prd" && !prdOpen(project);

  return ndjsonResponse(async (send) => {
    let written = "";
    let sent = 0;
    const onDelta = (delta: string) => {
      if (!previewOnly) return send({ type: "text", delta });
      written += delta;
      const visible = streamingPrdPreview(written, PRD_PREVIEW_SECTIONS);
      if (visible.length > sent) send({ type: "text", delta: visible.slice(sent) });
      sent = Math.max(sent, visible.length);
    };

    let content: string;
    try {
      content = await generateDocument(kind as DocKind, input, onDelta);
      // CLAUDE.md 와 어긋나면(src/ 폴더, CLAUDE.md 새로 만들기 지시) 한 번만 다시 만든다.
      // 같은 요청 안에서 다시 만들므로 크레딧은 아래에서 한 번만 처리된다.
      if (kind === "tasks") {
        const issues = checkTasks(content, claudeMd || null);
        if (issues.length) {
          console.warn("[documents] tasks check failed, regenerating", project.id, issues);
          send({ type: "restart" });
          content = await generateDocument(kind, input, onDelta);
          const again = checkTasks(content, claudeMd || null);
          if (again.length) console.error("[documents] tasks check failed after retry", project.id, again);
        }
      }
    } catch (err) {
      console.error(`[documents] ${kind} failed`, err);
      await markFailed();
      const { message, retryable } = describeAiError(err);
      send({ type: "error", message, retryable });
      return;
    }

    // 작업 단계를 처음 연 순간 크레딧 1 차감 + 잠금 해제 (이미 해제됐으면 차감 없음)
    let unlocked = project.unlocked;
    let openedPrd: string | undefined; // 이번에 잠금 해제됐으면 PRD 전체를 함께 보낸다
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
      if (!project.prd_free) openedPrd = prd;
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

    const preview = previewOnly ? splitPrdPreview(saved.content, PRD_PREVIEW_SECTIONS) : null;
    send({
      type: "done",
      document: {
        kind: saved.kind,
        status: saved.status,
        content: preview ? preview.preview : saved.content,
        rewriteCount: saved.rewrite_count,
        lockedTitles: preview?.lockedTitles,
      },
      unlocked,
      prd: openedPrd,
      credits: await loadCredits(userId),
    });
  });
}

export const POST = withErrors(handlePOST);
