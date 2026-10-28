import Link from "next/link";
import { CircleX } from "lucide-react";
import { safeNextPath } from "@/lib/access";
import { Button } from "@/components/ui/button";

export const metadata = { title: "결제 실패" };

// 토스가 붙여 보내는 message 는 화면에 그대로 쓰지 않는다 (주소만 바꿔 아무 글이나 띄울 수 있어서). 코드로 정해 둔 문구를 고른다.
const FAIL_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제가 취소됐어요.",
  PAY_PROCESS_ABORTED: "결제 진행 중 승인에 실패했어요. 다시 시도해 주세요.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했어요. 카드 정보와 한도를 확인해 주세요.",
};

// 토스 결제창에서 실패·취소하면 이곳으로 온다: ?code&message&orderId
export default async function PaymentFailPage(props: PageProps<"/credits/fail">) {
  const sp = await props.searchParams;
  const code = typeof sp.code === "string" && /^[A-Z0-9_]{1,64}$/.test(sp.code) ? sp.code : "";
  const message = !code
    ? "결제가 취소됐어요."
    : Object.hasOwn(FAIL_MESSAGES, code)
      ? FAIL_MESSAGES[code]
      : "결제를 완료하지 못했어요. 다시 시도해 주세요.";
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
