import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, ndjsonResponse } from "@/lib/ndjson";
import { generatePreview } from "@/lib/ai/preview";
import { describeAiError } from "@/lib/ai/client";
import { buildPreviewDoc } from "@/lib/preview-doc";
import { loadCredits, loadDocuments, loadPreview } from "@/lib/projects";
import { isAdmin } from "@/lib/admin";
import { normalizeSummary } from "@/lib/domain";

// 미리보기 웹앱은 상위 모델로 1분 안팎 걸린다 (검사에 걸리면 한 번 더 만들어 2분 남짓)
export const maxDuration = 300;

const GenerateSchema = z.object({ projectId: z.string() });

// 화면 미리보기 만들기
// - PRD 가 있어야 만들 수 있다. 잠금 해제와 상관없이 PRD 전체를 읽고 만든다(내용은 화면 글로만 쓰인다)
// - 크레딧 1건을 따로 쓴다. 생성에 성공해 저장할 때만 차감하고(complete_preview), 실패하면 차감하지 않는다
// - 개발자 계정은 차감하지 않는다 (complete_preview 안에서 처리)
async function handlePOST(request: Request) {
  const parsed = GenerateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "잘못된 요청이에요.");

  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "미리보기를 만들려면 로그인이 필요해요.", "login_required");
  const userId = viewer.userId;

  const project = await getProjectForViewer(parsed.data.projectId, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.");

  const docs = await loadDocuments(project.id);
  const prd = docs.prd?.status === "ready" ? docs.prd.content : "";
  if (!prd) return jsonError(409, "PRD를 먼저 만들어 주세요.", "need_prd");

  const existing = await loadPreview(project.id, false);
  if (existing?.status === "ready") return jsonError(409, "이미 만들어진 미리보기예요.", "exists");

  if (!(await isAdmin(userId)) && (await loadCredits(userId)) < 1) {
    return jsonError(402, "크레딧이 필요해요.", "no_credit");
  }

  const admin = createAdminClient();
  // 형식이 다른 옛 저장본(DB 에는 완료로 남아 있음)은 실패로 돌려 다시 만들 수 있게 한다
  if (existing?.status === "failed") {
    await admin.from("previews").update({ status: "failed" }).eq("project_id", project.id).eq("status", "ready");
  }

  const { data: locked, error: lockError } = await admin.rpc("start_preview_generation", {
    p_project_id: project.id,
  });
  if (lockError) {
    console.error("[preview] lock failed", lockError);
    return jsonError(500, "미리보기를 시작하지 못했어요. 다시 시도해 주세요.");
  }
  if (!locked) return jsonError(409, "다른 창에서 미리보기를 만드는 중이에요.", "generating");

  const markFailed = () =>
    admin
      .from("previews")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("project_id", project.id);

  return ndjsonResponse(async (send) => {
    let content;
    try {
      content = await generatePreview(
        { summary: normalizeSummary(project.summary), prd },
        (stage) => send({ type: "stage", stage }),
        () => send({ type: "restart" }),
      );
    } catch (err) {
      console.error("[preview] failed", err);
      await markFailed();
      const { message, retryable } = describeAiError(err);
      send({ type: "error", message, retryable });
      return;
    }

    const { data: result, error } = await admin.rpc("complete_preview", {
      p_project_id: project.id,
      p_user_id: userId,
      p_content: content,
    });
    if (error || (result !== "ready" && result !== "already")) {
      if (error) console.error("[preview] save failed", error);
      await markFailed();
      send({
        type: "error",
        message:
          result === "no_credit" ? "크레딧이 부족해요. 충전 후 다시 시도해 주세요." : "미리보기를 저장하지 못했어요. 다시 시도해 주세요.",
        code: result === "no_credit" ? "no_credit" : undefined,
        retryable: result !== "no_credit",
      });
      return;
    }

    // 'already' 면 다른 창이 먼저 저장했으니 저장된 것을 보낸다 (크레딧은 그쪽에서 한 번만 차감됨)
    const saved = result === "already" ? await loadPreview(project.id) : null;
    send({
      type: "done",
      doc: saved?.doc ?? buildPreviewDoc(content),
      kit: saved?.kit ?? content.kit,
      credits: await loadCredits(userId),
    });
  });
}

// 다른 창에서 만드는 중일 때 상태 확인용 (문서는 보내지 않는다. 완성되면 화면이 새로 불러온다)
async function handleGET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "로그인이 필요해요.", "login_required");
  const project = await getProjectForViewer(projectId, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.");
  const preview = await loadPreview(project.id, false);
  return Response.json({
    status: preview?.status ?? null,
    updatedAt: preview?.updatedAt ?? null,
    credits: await loadCredits(viewer.userId),
  });
}

export const POST = withErrors(handlePOST);
export const GET = withErrors(handleGET);
