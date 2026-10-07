import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="display-title text-[96px]">404</p>
      <p className="font-display text-2xl font-light tracking-[-0.03em]">페이지를 찾을 수 없어요</p>
      <p className="text-sm text-muted-foreground">주소가 바뀌었거나, 다른 계정의 프로젝트일 수 있어요.</p>
      <Button asChild className="mt-2">
        <Link href="/">처음으로</Link>
      </Button>
    </main>
  );
}
