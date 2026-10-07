import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-7 mono-label text-muted-foreground sm:px-8 lg:px-12">
        <span>© dot.PRD</span>
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
