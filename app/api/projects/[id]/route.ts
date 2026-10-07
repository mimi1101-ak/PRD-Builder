import { withErrors } from "@/lib/route";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/ndjson";

// 프로젝트 삭제. 대화·문서는 DB 에서 함께 지워진다 (on delete cascade).
async function handleDELETE(_request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  const project = await getProjectForViewer(id, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.", "not_found");

  const admin = createAdminClient();
  const { error } = await admin.from("projects").delete().eq("id", project.id);
  if (error) {
    console.error("[projects] delete failed", error);
    return jsonError(500, "프로젝트를 삭제하지 못했어요. 다시 시도해 주세요.");
  }

  return Response.json({ ok: true });
}

export const DELETE = withErrors(handleDELETE);
