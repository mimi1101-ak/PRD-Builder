import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { getViewer } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { LoginButtons } from "@/components/login-buttons";
import { SiteFooter } from "@/components/site-footer";
import { ProjectMenu } from "@/components/projects/project-menu";
import type { ProjectStatus } from "@/lib/domain";

export const metadata = { title: "내 프로젝트" };

type Row = {
  id: string;
  title: string | null;
  idea: string;
  status: ProjectStatus;
  unlocked: boolean;
  created_at: string;
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  interviewing: "인터뷰 중",
  final_check: "최종 확인 중",
  done: "완료",
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

  return (
    <>
      <main className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono-label text-muted-foreground">Projects</p>
            <h1 className="display-title mt-3 text-[clamp(36px,5vw,56px)]">내 프로젝트</h1>
          </div>
          <Button asChild>
            <Link href="/">
              <Plus /> 새 아이디어
            </Link>
          </Button>
        </div>

        {!viewer.userId && (
          <div className="mt-8 rounded-[20px] border p-6">
            <p className="font-display text-xl font-light tracking-[-0.02em]">로그인하면 프로젝트가 계정에 저장돼요</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              지금 보이는 목록은 이 브라우저에서만 볼 수 있어요. 로그인하면 다른 기기에서도 이어서 할 수 있어요.
            </p>
            <LoginButtons next="/projects" className="mt-5 max-w-xs" />
          </div>
        )}

        {rows.length === 0 ? (
          <div className="mt-10 rounded-[20px] border border-dashed border-line-strong p-12 text-center text-muted-foreground">
            아직 프로젝트가 없어요.{" "}
            <Link href="/" className="font-medium text-foreground underline underline-offset-4">
              아이디어 한 줄
            </Link>
            로 시작해 보세요.
          </div>
        ) : (
          <ul className="mt-10 border-t">
            {rows.map((p, i) => {
              const href = p.status === "done" ? `/p/${p.id}` : `/p/${p.id}/chat`;
              return (
                <li key={p.id} className="flex items-center gap-1 border-b transition-colors hover:bg-muted/50 sm:pr-2">
                  <Link
                    href={href}
                    className="group grid min-w-0 flex-1 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 py-5 sm:grid-cols-[48px_minmax(0,1fr)_auto_auto] sm:px-2"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[22px] font-light tracking-[-0.02em]">{p.title || p.idea}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatDate(p.created_at)}</p>
                    </div>
                    <span
                      className={
                        "rounded-full border px-2.5 py-1 text-xs " +
                        (p.status === "done" ? "border-foreground bg-foreground text-background" : "border-line-strong text-ink-2")
                      }
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors group-hover:text-foreground sm:inline-flex">
                      {p.status === "done" ? "결과 보기" : "이어하기"}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                  <ProjectMenu projectId={p.id} title={p.title || p.idea} unlocked={p.unlocked} />
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
