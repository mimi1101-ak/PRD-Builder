import Link from "next/link";
import { getViewer } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";

const navLink =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 transition-colors hover:bg-muted hover:text-foreground";

export async function SiteHeader() {
  const viewer = await getViewer();
  let profile: { nickname: string | null; credits: number } | null = null;
  if (viewer.userId) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("nickname, credits").eq("id", viewer.userId).maybeSingle();
    profile = data ?? { nickname: null, credits: 0 };
  }

  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 bg-background/80 backdrop-blur-md backdrop-saturate-150">
      <div className="flex h-full items-center justify-between gap-2 px-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          <Logo className="size-5" />
          <span>dot.PRD</span>
        </Link>
        <nav className="flex items-center gap-0.5 text-[13.5px] text-ink-2">
          <Link href="/projects" className={navLink}>
            내 프로젝트
          </Link>
          {profile ? (
            <>
              <Link href="/credits" className={navLink}>
                크레딧 <span className="font-mono text-xs font-medium text-foreground">{profile.credits}</span>
              </Link>
              <UserMenu nickname={profile.nickname ?? "메이커"} />
            </>
          ) : (
            <Button asChild variant="outline" size="sm" className="ml-1.5">
              <Link href="/login">로그인</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
