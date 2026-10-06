import { notFound, redirect } from "next/navigation";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { loadMessages } from "@/lib/projects";
import { toProjectView } from "@/lib/domain";
import { ChatView } from "@/components/chat/chat-view";

export const metadata = { title: "아이디어 대화" };

export default async function ChatPage(props: PageProps<"/p/[id]/chat">) {
  const { id } = await props.params;
  const viewer = await getViewer();
  const project = await getProjectForViewer(id, viewer);
  if (!project) {
    // 다른 기기에서 로그인해 만든 프로젝트일 수 있으니 로그인부터 안내
    if (!viewer.userId) redirect(`/login?next=${encodeURIComponent(`/p/${id}/chat`)}`);
    notFound();
  }

  const messages = await loadMessages(project.id);
  return (
    <ChatView
      key={project.id}
      initialProject={toProjectView(project)}
      initialMessages={messages}
      isLoggedIn={!!viewer.userId}
    />
  );
}
