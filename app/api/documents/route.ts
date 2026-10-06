import { getProjectForViewer, getViewer } from "@/lib/access";
import { withErrors } from "@/lib/route";
import { jsonError } from "@/lib/ndjson";
import { loadCredits, loadDocuments, toDocState } from "@/lib/projects";
import { REWRITES_PER_CREDIT, toProjectView } from "@/lib/domain";

// 결과 화면 새로고침용: 문서 3종의 상태와 내용. 잠금 해제 전에는 작업 단계·CLAUDE.md 내용을 보내지 않는다.
async function handleGET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
  const viewer = await getViewer();
  const project = await getProjectForViewer(projectId, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.");

  const docs = await loadDocuments(project.id);
  const rewritesUsed = Object.values(docs).reduce((sum, d) => sum + (d?.rewrite_count ?? 0), 0);

  return Response.json({
    project: toProjectView(project),
    documents: {
      prd: toDocState(docs.prd),
      tasks: project.unlocked ? toDocState(docs.tasks) : null,
      claude_md: project.unlocked ? toDocState(docs.claude_md) : null,
    },
    rewritesLeft: Math.max(0, REWRITES_PER_CREDIT - rewritesUsed),
    credits: viewer.userId ? await loadCredits(viewer.userId) : 0,
  });
}

export const GET = withErrors(handleGET);
