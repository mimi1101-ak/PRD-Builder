import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-6 text-xs text-muted-foreground">
        <span>© PRD 빌더</span>
        <Link href="/terms" className="hover:text-foreground">
          이용약관
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          개인정보처리방침
        </Link>
      </div>
    </footer>
  );
}
