import { cookies } from "next/headers";
import { getViewer } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoginButtons } from "@/components/login-buttons";
import { SiteFooter } from "@/components/site-footer";
import { ProjectsView, type ProjectItem } from "@/components/projects/projects-view";
import { PROJECTS_VIEW_COOKIE, type ProjectStatus } from "@/lib/domain";

export const metadata = { title: "내 프로젝트" };

type Row = {
  id: string;
  title: string | null;
  idea: string;
  status: ProjectStatus;
  unlocked: boolean;
  created_at: string;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export default async function ProjectsPage() {
  const viewer = await getViewer();
  let rows: Row[] = [];

  if (viewer.userId) {
    // 로그인 사용자: RLS 가 자기 프로젝트만 돌려준다
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, title, idea, status, unlocked, created_at")
      .order("created_at", { ascending: false });
    rows = (data ?? []) as Row[];
  } else if (viewer.guestToken) {
    // 로그인 전: 이 브라우저에서 만든 프로젝트만
    const admin = createAdminClient();
    const { data } = await admin
      .from("projects")
      .select("id, title, idea, status, unlocked, created_at")
      .eq("guest_token", viewer.guestToken)
      .is("user_id", null)
      .order("created_at", { ascending: false });
    rows = (data ?? []) as Row[];
  }

  const items: ProjectItem[] = rows.map((p) => ({
    id: p.id,
    title: p.title || p.idea,
    status: p.status,
    unlocked: p.unlocked,
    date: formatDate(p.created_at),
    href: p.status === "done" ? `/p/${p.id}` : `/p/${p.id}/chat`,
  }));
  // 처음엔 우주 보기. 목록을 고른 사람은 쿠키로 기억한다.
  const initialView = (await cookies()).get(PROJECTS_VIEW_COOKIE)?.value === "list" ? "list" : "space";

  return (
    <>
      <ProjectsView
        items={items}
        initialView={initialView}
        notice={
          !viewer.userId && (
            <div className="mt-8 rounded-[20px] border p-6">
              <p className="font-display text-xl font-light tracking-[-0.02em]">로그인하면 프로젝트가 계정에 저장돼요</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                지금 보이는 목록은 이 브라우저에서만 볼 수 있어요. 로그인하면 다른 기기에서도 이어서 할 수 있어요.
              </p>
              <LoginButtons next="/projects" className="mt-5 max-w-xs" />
            </div>
          )
        }
      />
      <SiteFooter />
    </>
  );
}
