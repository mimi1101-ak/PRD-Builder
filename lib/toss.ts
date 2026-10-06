import "server-only";
import { tossSecretKey } from "@/lib/env";

// 토스페이먼츠 결제 승인·조회 API (서버 전용 — 시크릿 키 사용)
const TOSS_API = "https://api.tosspayments.com/v1/payments";

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  status: string; // READY, IN_PROGRESS, DONE, CANCELED, ABORTED, EXPIRED ...
  totalAmount: number;
  approvedAt?: string;
};

type TossResult = { ok: true; payment: TossPayment } | { ok: false; code: string; message: string };

function headers(extra?: Record<string, string>) {
  return {
    Authorization: "Basic " + Buffer.from(`${tossSecretKey()}:`).toString("base64"),
    "Content-Type": "application/json",
    ...extra,
  };
}

async function toResult(res: Response): Promise<TossResult> {
  const data = (await res.json().catch(() => ({}))) as Partial<TossPayment> & {
    code?: string;
    message?: string;
  };
  if (!res.ok) {
    return { ok: false, code: data.code ?? `HTTP_${res.status}`, message: data.message ?? "결제 승인에 실패했어요." };
  }
  return { ok: true, payment: data as TossPayment };
}

export async function confirmTossPayment(paymentKey: string, orderId: string, amount: number) {
  const res = await fetch(`${TOSS_API}/confirm`, {
    method: "POST",
    // 같은 주문을 여러 번 승인 요청해도 토스가 한 번만 처리하게 하는 키
    headers: headers({ "Idempotency-Key": orderId }),
    body: JSON.stringify({ paymentKey, orderId, amount }),
    cache: "no-store",
  });
  return toResult(res);
}

export async function getTossPayment(paymentKey: string) {
  const res = await fetch(`${TOSS_API}/${encodeURIComponent(paymentKey)}`, {
    headers: headers(),
    cache: "no-store",
  });
  return toResult(res);
}
