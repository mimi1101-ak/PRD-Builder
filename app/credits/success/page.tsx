import { safeNextPath } from "@/lib/access";
import { ConfirmPayment } from "@/components/credits/confirm-payment";

export const metadata = { title: "결제 확인" };

// 토스 결제창이 성공하면 이곳으로 돌아온다: ?paymentKey&orderId&amount
// 이 단계에서는 아직 결제가 끝난 게 아니다. 서버가 승인 API 를 호출해야 완료된다.
export default async function PaymentSuccessPage(props: PageProps<"/credits/success">) {
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return (
    <ConfirmPayment
      paymentKey={get("paymentKey")}
      orderId={get("orderId")}
      amount={get("amount")}
      next={safeNextPath(get("next") || null, "/credits")}
    />
  );
}
