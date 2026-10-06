import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { getViewer } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoginButtons } from "@/components/login-buttons";
import { SiteFooter } from "@/components/site-footer";
import type { ProjectStatus } from "@/lib/domain";

export const metadata = { title: "내 프로젝트" };

type Row = { id: string; title: string | null; idea: string; status: ProjectStatus; created_at: string };

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
      .select("id, title, idea, status, created_at")
      .order("created_at", { ascending: false });
    rows = (data ?? []) as Row[];
  } else if (viewer.guestToken) {
    // 로그인 전: 이 브라우저에서 만든 프로젝트만
    const admin = createAdminClient();
    const { data } = await admin
      .from("projects")
      .select("id, title, idea, status, created_at")
      .eq("guest_token", viewer.guestToken)
      .is("user_id", null)
      .order("created_at", { ascending: false });
    rows = (data ?? []) as Row[];
  }

  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">내 프로젝트</h1>
          <Button asChild size="sm">
            <Link href="/">
              <Plus /> 새 아이디어
            </Link>
          </Button>
        </div>

        {!viewer.userId && (
          <div className="mt-6 rounded-2xl border bg-card p-5">
            <p className="font-medium">로그인하면 프로젝트가 계정에 저장돼요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              지금 보이는 목록은 이 브라우저에서만 볼 수 있어요. 로그인하면 다른 기기에서도 이어서 할 수 있어요.
            </p>
            <LoginButtons next="/projects" className="mt-4 max-w-xs" />
          </div>
        )}

        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            아직 프로젝트가 없어요.{" "}
            <Link href="/" className="font-medium text-foreground underline">
              아이디어 한 줄
            </Link>
            로 시작해 보세요.
          </div>
        ) : (
          <ul className="mt-6 divide-y rounded-2xl border bg-card">
            {rows.map((p) => {
              const href = p.status === "done" ? `/p/${p.id}` : `/p/${p.id}/chat`;
              return (
                <li key={p.id}>
                  <Link href={href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.title || p.idea}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                    </div>
                    <Badge variant={p.status === "done" ? "default" : "secondary"}>{STATUS_LABEL[p.status]}</Badge>
                    <span className="hidden text-sm text-muted-foreground sm:inline">
                      {p.status === "done" ? "결과 보기" : "이어하기"}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
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
