import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/ndjson";
import { PRODUCTS, type ProductKey } from "@/lib/domain";

const PrepareSchema = z.object({ product: z.enum(Object.keys(PRODUCTS) as [ProductKey, ...ProductKey[]]) });

// 결제창을 띄우기 전에 주문을 서버에 먼저 기록한다. 금액은 서버가 정한다(브라우저 값을 믿지 않음).
async function handlePOST(request: Request) {
  const parsed = PrepareSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "상품을 선택해 주세요.");

  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "결제하려면 로그인이 필요해요.", "login_required");

  const product = PRODUCTS[parsed.data.product];
  const orderId = `ord-${crypto.randomUUID()}`; // 토스 규칙: 6~64자 영문·숫자·-·_

  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({
    user_id: viewer.userId,
    order_id: orderId,
    product: parsed.data.product,
    amount: product.amount,
    credits_added: product.credits,
    status: "ready",
  });
  if (error) {
    console.error("[payments] prepare failed", error);
    return jsonError(500, "주문을 만들지 못했어요. 다시 시도해 주세요.");
  }

  return Response.json({
    orderId,
    orderName: product.name,
    amount: product.amount,
    customerKey: viewer.userId,
  });
}

export const POST = withErrors(handlePOST);
