import { notFound, redirect } from "next/navigation";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { loadCredits, loadDocuments, loadPreview } from "@/lib/projects";
import { isAdmin } from "@/lib/admin";
import { toProjectView } from "@/lib/domain";
import { samplePreviewDoc } from "@/lib/preview-doc";
import { PreviewView } from "@/components/preview/preview-view";
import { PRIVATE_ROBOTS } from "@/lib/site";

export const metadata = { title: "화면 미리보기", robots: PRIVATE_ROBOTS };

export default async function PreviewPage(props: PageProps<"/p/[id]/preview">) {
  const { id } = await props.params;
  const viewer = await getViewer();
  const project = await getProjectForViewer(id, viewer);
  if (!project) {
    if (!viewer.userId) redirect(`/login?next=${encodeURIComponent(`/p/${id}/preview`)}`);
    notFound();
  }
  if (project.status === "interviewing") redirect(`/p/${id}/chat`);

  // 미리보기는 PRD 를 읽고 만든다. 로그인·PRD 생성은 결과 화면에서 처리한다
  const docs = await loadDocuments(project.id);
  if (!viewer.userId || docs.prd?.status !== "ready" || !docs.prd.content) redirect(`/p/${id}`);

  const preview = await loadPreview(project.id);
  return (
    <PreviewView
      key={project.id}
      projectId={project.id}
      title={toProjectView(project).title}
      initialPreview={preview}
      // 아직 만들기 전이면 다른 아이디어로 만든 예시를 함께 보여 준다
      sampleDoc={preview?.status === "ready" ? null : samplePreviewDoc()}
      initialCredits={await loadCredits(viewer.userId)}
      isDeveloper={await isAdmin(viewer.userId)}
    />
  );
}
