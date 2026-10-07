import Link from "next/link";
import { CircleX } from "lucide-react";
import { safeNextPath } from "@/lib/access";
import { Button } from "@/components/ui/button";

export const metadata = { title: "결제 실패" };

// 토스 결제창에서 실패·취소하면 이곳으로 온다: ?code&message&orderId
export default async function PaymentFailPage(props: PageProps<"/credits/fail">) {
  const sp = await props.searchParams;
  const message = typeof sp.message === "string" ? sp.message : "결제가 취소됐어요.";
  const code = typeof sp.code === "string" ? sp.code : "";
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null, "/credits");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-[20px] border px-7 pb-7 pt-8 text-center">
        <CircleX className="mx-auto size-9 text-destructive" />
        <p className="mt-4 font-display text-2xl font-light tracking-[-0.03em]">결제가 완료되지 않았어요</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        {code && <p className="mt-1 text-xs text-muted-foreground/70">오류 코드: {code}</p>}
        <p className="mt-3 text-xs text-muted-foreground">크레딧은 차감·지급되지 않았어요.</p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href={`/credits?next=${encodeURIComponent(next)}`}>다시 시도하기</Link>
        </Button>
      </div>
    </main>
  );
}
