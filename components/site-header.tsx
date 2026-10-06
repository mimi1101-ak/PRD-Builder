import Link from "next/link";
import { getViewer } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const viewer = await getViewer();
  let profile: { nickname: string | null; credits: number } | null = null;
  if (viewer.userId) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("nickname, credits").eq("id", viewer.userId).maybeSingle();
    profile = data ?? { nickname: null, credits: 0 };
  }

  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo className="size-6" />
          <span>PRD 빌더</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">내 프로젝트</Link>
          </Button>
          {profile ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/credits">
                  크레딧 <span className="font-semibold text-brand">{profile.credits}</span>
                </Link>
              </Button>
              <UserMenu nickname={profile.nickname ?? "메이커"} />
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">로그인</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
