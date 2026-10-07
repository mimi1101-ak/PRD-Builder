"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// 화면을 그리다 서버 오류가 나면 보이는 페이지 (개발 모드에서는 Next.js 오류 창이 먼저 뜬다)
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="mono-label text-muted-foreground">Error</p>
      <p className="display-title text-[44px]">문제가 생겼어요</p>
      <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요. 계속되면 관리자에게 알려 주세요.</p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>다시 시도</Button>
        <Button asChild variant="outline">
          <Link href="/">처음으로</Link>
        </Button>
      </div>
    </main>
  );
}
