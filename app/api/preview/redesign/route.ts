import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, ndjsonResponse } from "@/lib/ndjson";
import { generatePreview } from "@/lib/ai/preview";
import { describeAiError } from "@/lib/ai/client";
import { buildPreviewDoc, readPreviewContent } from "@/lib/preview-doc";
import { loadDocuments } from "@/lib/projects";
import { isAdmin } from "@/lib/admin";
import { normalizeSummary } from "@/lib/domain";
import { PREVIEW_KITS, redesignBusy, type PreviewContent } from "@/lib/preview";

// 미리보기 웹앱은 상위 모델로 1분 안팎 걸린다 (검사에 걸리면 한 번 더 만들어 2분 남짓)
export const maxDuration = 300;

const RedesignSchema = z.object({ projectId: z.string(), kit: z.enum(PREVIEW_KITS) });

// 다른 디자인으로 다시 만들기
// - 이미 만든 미리보기마다 한 번, 크레딧 없이 (개발자 계정은 제한 없음)
// - 고른 디자인 키트로 처음부터 다시 만든다. 성공하면 미리보기를 바꾸고 기회를 쓴 것으로 표시한다
// - 실패하면 원래 미리보기와 기회는 그대로 둔다
// - 같은 미리보기를 동시에 두 번 바꾸지 않게, 읽은 뒤 바뀌지 않았을 때만(updated_at 비교) 잠금 표시를 남긴다
async function handlePOST(request: Request) {
  const parsed = RedesignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "잘못된 요청이에요.");
  const { kit } = parsed.data;

  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "로그인이 필요해요.", "login_required");
  const userId = viewer.userId;

  const project = await getProjectForViewer(parsed.data.projectId, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.");

  const docs = await loadDocuments(project.id);
  const prd = docs.prd?.status === "ready" ? docs.prd.content : "";
  if (!prd) return jsonError(409, "PRD를 먼저 만들어 주세요.", "need_prd");

  const admin = createAdminClient();
  const { data: row, error: readError } = await admin
    .from("previews")
    .select("status, content, updated_at")
    .eq("project_id", project.id)
    .maybeSingle();
  if (readError) throw readError;
  const content = row?.status === "ready" ? readPreviewContent(row.content) : null;
  if (!row || !content) return jsonError(409, "먼저 미리보기를 만들어 주세요.", "not_ready");

  if (content.redesignUsed && !(await isAdmin(userId))) {
    return jsonError(409, "디자인 바꾸기는 미리보기마다 한 번만 할 수 있어요.", "used");
  }
  if (redesignBusy(content)) return jsonError(409, "다른 창에서 디자인을 바꾸는 중이에요.", "generating");
  if (kit === content.kit) return jsonError(400, "지금과 다른 디자인을 골라 주세요.", "same_kit");

  const startedAt = new Date().toISOString();
  const { data: locked, error: lockError } = await admin
    .from("previews")
    .update({ content: { ...content, redesignStartedAt: startedAt }, updated_at: startedAt })
    .eq("project_id", project.id)
    .eq("status", "ready")
    .eq("updated_at", row.updated_at)
    .select("project_id");
  if (lockError) {
    console.error("[preview] redesign lock failed", lockError);
    return jsonError(500, "디자인 바꾸기를 시작하지 못했어요. 다시 시도해 주세요.");
  }
  if (!locked?.length) return jsonError(409, "다른 창에서 디자인을 바꾸는 중이에요.", "generating");

  // 실패하면 잠금만 풀고 원래 미리보기는 그대로
  const unlock = () =>
    admin
      .from("previews")
      .update({ content: { ...content, redesignStartedAt: null }, updated_at: new Date().toISOString() })
      .eq("project_id", project.id)
      .eq("status", "ready");

  return ndjsonResponse(async (send) => {
    let next: PreviewContent;
    try {
      const generated = await generatePreview(
        { summary: normalizeSummary(project.summary), prd },
        (stage) => send({ type: "stage", stage }),
        () => send({ type: "restart" }),
        kit,
      );
      next = { ...generated, redesignUsed: true, redesignStartedAt: null };
    } catch (err) {
      console.error("[preview] redesign failed", err);
      await unlock();
      const { message, retryable } = describeAiError(err);
      send({ type: "error", message, retryable });
      return;
    }

    const { error } = await admin
      .from("previews")
      .update({ content: next, updated_at: new Date().toISOString() })
      .eq("project_id", project.id)
      .eq("status", "ready");
    if (error) {
      console.error("[preview] redesign save failed", error);
      await unlock();
      send({ type: "error", message: "미리보기를 저장하지 못했어요. 다시 시도해 주세요.", retryable: true });
      return;
    }

    send({ type: "done", doc: buildPreviewDoc(next), kit: next.kit, redesignUsed: true });
  });
}

export const POST = withErrors(handlePOST);
