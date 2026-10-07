import { notFound, redirect } from "next/navigation";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { loadCredits, loadDocuments, toDocState } from "@/lib/projects";
import { REWRITES_PER_CREDIT, toProjectView } from "@/lib/domain";
import { ResultView } from "@/components/results/result-view";
import { LoginButtons } from "@/components/login-buttons";
import { Logo } from "@/components/logo";

export const metadata = { title: "결과 문서" };

export default async function ResultPage(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  const viewer = await getViewer();
  const project = await getProjectForViewer(id, viewer);
  if (!project) {
    if (!viewer.userId) redirect(`/login?next=${encodeURIComponent(`/p/${id}`)}`);
    notFound();
  }

  // 최종 확인을 거치지 않았으면 대화로 돌려보낸다 (PRD: 생성 전 반드시 최종 확인)
  if (project.status === "interviewing") redirect(`/p/${id}/chat`);

  const view = toProjectView(project);

  // 로그인은 문서를 만들기 직전에 요구한다 (PRD F3)
  if (!viewer.userId) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-[20px] border px-7 pb-7 pt-8 text-center">
          <Logo className="mx-auto size-7" />
          <p className="mono-label mt-5 text-muted-foreground">Almost there</p>
          <h1 className="mt-2 font-display text-[30px] font-light leading-tight tracking-[-0.03em]">로그인하고 PRD 받기</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            &lsquo;{view.title}&rsquo; 대화는 그대로 저장돼요. 로그인하면 바로 PRD를 만들어 드릴게요.
          </p>
          <LoginButtons next={`/p/${id}`} className="mt-6" />
        </div>
      </main>
    );
  }

  const docs = await loadDocuments(project.id);
  const rewritesUsed = Object.values(docs).reduce((sum, d) => sum + (d?.rewrite_count ?? 0), 0);

  return (
    <ResultView
      key={project.id}
      project={view}
      initialDocs={{
        prd: toDocState(docs.prd),
        // 잠금 해제 전에는 유료 문서 내용을 브라우저로 보내지 않는다
        tasks: project.unlocked ? toDocState(docs.tasks) : null,
        claude_md: project.unlocked ? toDocState(docs.claude_md) : null,
      }}
      initialCredits={await loadCredits(viewer.userId)}
      initialRewritesLeft={Math.max(0, REWRITES_PER_CREDIT - rewritesUsed)}
    />
  );
}
