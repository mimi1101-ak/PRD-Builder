import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/ndjson";
import { confirmTossPayment, getTossPayment, type TossPayment } from "@/lib/toss";
import { loadCredits } from "@/lib/projects";

const ConfirmSchema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z.string().min(6).max(64),
  amount: z.coerce.number().int().positive(),
});

// 결제 승인 (토스 successUrl 에서 호출). 크레딧은 토스가 "DONE"(승인 완료)을 확인해 준 뒤에만,
// 그리고 같은 주문은 딱 한 번만 지급한다 (complete_payment SQL 함수가 보장).
async function handlePOST(request: Request) {
  const parsed = ConfirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "결제 정보가 올바르지 않아요.");
  const { paymentKey, orderId, amount } = parsed.data;

  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "로그인이 필요해요.", "login_required");

  const admin = createAdminClient();
  const { data: order } = await admin.from("payments").select("*").eq("order_id", orderId).maybeSingle();
  if (!order || order.user_id !== viewer.userId) return jsonError(404, "주문을 찾을 수 없어요.");

  // 새로고침으로 다시 들어와도 한 번만 처리된다.
  if (order.status === "done") {
    return Response.json({
      ok: true,
      alreadyProcessed: true,
      creditsAdded: 0,
      credits: await loadCredits(viewer.userId),
    });
  }
  if (order.status === "canceled") return jsonError(409, "취소된 주문이에요.");
  if (amount !== order.amount) return jsonError(400, "결제 금액이 주문과 달라요.", "amount_mismatch");

  let result = await confirmTossPayment(paymentKey, orderId, order.amount);
  // 이미 승인된 결제(예: 승인 직후 네트워크 끊김)면 토스에 상태를 다시 물어본다.
  if (!result.ok && result.code === "ALREADY_PROCESSED_PAYMENT") {
    result = await getTossPayment(paymentKey);
  }

  if (!result.ok) {
    await admin.from("payments").update({ status: "failed" }).eq("order_id", orderId).eq("status", "ready");
    return jsonError(400, result.message, result.code);
  }

  const payment: TossPayment = result.payment;
  if (payment.status !== "DONE" || payment.orderId !== orderId || payment.totalAmount !== order.amount) {
    return jsonError(400, "결제가 완료되지 않았어요.", "not_done");
  }

  const { data: granted, error } = await admin.rpc("complete_payment", {
    p_order_id: orderId,
    p_payment_key: payment.paymentKey,
    p_amount: payment.totalAmount,
  });
  if (error) {
    console.error("[payments] complete failed", error);
    return jsonError(500, "결제는 됐지만 크레딧 지급에 실패했어요. 고객센터로 문의해 주세요.");
  }

  const creditsAdded = (granted as { granted: boolean; credits_added?: number })?.credits_added ?? 0;
  return Response.json({ ok: true, creditsAdded, credits: await loadCredits(viewer.userId) });
}

export const POST = withErrors(handlePOST);
