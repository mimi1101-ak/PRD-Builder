import { createAdminClient } from "@/lib/supabase/admin";
import { withErrors } from "@/lib/route";
import { getTossPayment } from "@/lib/toss";

// 토스페이먼츠 웹훅 (결제 상태 변경 알림).
// 웹훅 본문은 위조될 수 있으므로 믿지 않고, paymentKey 로 토스 API 에 직접 상태를 확인한 뒤 처리한다.
// 승인 화면(confirm)과 웹훅 중 먼저 도착한 쪽이 크레딧을 지급하고, 나머지는 complete_payment 가 무시한다.
async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    eventType?: string;
    data?: { paymentKey?: string; orderId?: string };
  } | null;

  const paymentKey = body?.data?.paymentKey;
  if (body?.eventType !== "PAYMENT_STATUS_CHANGED" || !paymentKey) {
    return Response.json({ ok: true, ignored: true });
  }

  const result = await getTossPayment(paymentKey);
  if (!result.ok) {
    console.error("[webhook] toss lookup failed", result);
    // 토스가 재전송하도록 실패 응답
    return Response.json({ ok: false }, { status: 500 });
  }

  const payment = result.payment;
  const admin = createAdminClient();

  if (payment.status === "DONE") {
    const { error } = await admin.rpc("complete_payment", {
      p_order_id: payment.orderId,
      p_payment_key: payment.paymentKey,
      p_amount: payment.totalAmount,
    });
    if (error) {
      console.error("[webhook] complete failed", error);
      return Response.json({ ok: false }, { status: 500 });
    }
  } else if (["CANCELED", "ABORTED", "EXPIRED"].includes(payment.status)) {
    // 승인 전 주문만 정리한다. (승인된 결제의 환불·크레딧 회수 규정은 PRD 미결 사항)
    await admin
      .from("payments")
      .update({ status: "canceled" })
      .eq("order_id", payment.orderId)
      .in("status", ["ready", "failed"]);
  }

  return Response.json({ ok: true });
}

export const POST = withErrors(handlePOST);
