"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { Button } from "@/components/ui/button";
import { PRODUCTS, type ProductKey } from "@/lib/domain";
import { readJsonError } from "@/lib/ndjson";
import { cn } from "@/lib/utils";

type Prepared = { orderId: string; orderName: string; amount: number; customerKey: string };

export function BuyButtons({ next }: { next: string }) {
  const [pending, setPending] = useState<ProductKey | null>(null);
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  async function buy(product: ProductKey) {
    if (!clientKey) {
      toast.error("결제 키(NEXT_PUBLIC_TOSS_CLIENT_KEY)가 설정되지 않았어요.");
      return;
    }
    setPending(product);
    try {
      // 1) 서버에 주문 기록 (금액은 서버가 정함)
      const res = await fetch("/api/payments/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      if (!res.ok) {
        toast.error((await readJsonError(res)).message);
        setPending(null);
        return;
      }
      const order = (await res.json()) as Prepared;

      // 2) 토스 결제창 열기 → 성공하면 successUrl 로 이동해 서버가 승인
      const toss = await loadTossPayments(clientKey);
      const payment = toss.payment({ customerKey: order.customerKey });
      const back = encodeURIComponent(next);
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/credits/success?next=${back}`,
        failUrl: `${window.location.origin}/credits/fail?next=${back}`,
        card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false },
      });
    } catch (err) {
      // 사용자가 결제창을 닫은 경우 포함
      const code = (err as { code?: string })?.code;
      if (code !== "USER_CANCEL") toast.error("결제를 시작하지 못했어요. 다시 시도해 주세요.");
      setPending(null);
    }
  }

  return (
    <div>
      {!clientKey && (
        <p className="mb-5 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-2">
          결제를 준비하고 있어요. 지금은 크레딧을 구매할 수 없어요. (운영자: 토스페이먼츠 키를 .env.local 에 넣으면
          결제가 켜져요)
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(PRODUCTS) as ProductKey[]).map((key) => {
          const p = PRODUCTS[key];
          const best = key === "credit_5";
          return (
            <div key={key} className={cn("relative rounded-[20px] border p-6", best && "border-foreground")}>
              {best && (
                <span className="mono-label absolute -top-2.5 right-5 rounded-full bg-foreground px-2.5 py-1 text-[10px] text-background">
                  건당 {Math.round(p.amount / p.credits).toLocaleString()}원
                </span>
              )}
              <p className="mono-label text-muted-foreground">크레딧 {p.credits}건</p>
              <p className="mt-3 font-display text-4xl font-extralight tracking-[-0.04em]">{p.amount.toLocaleString()}원</p>
              <p className="mt-2 text-sm text-muted-foreground">프로젝트 {p.credits}개의 작업 단계 + CLAUDE.md 열기</p>
              <Button
                onClick={() => buy(key)}
                disabled={pending !== null || !clientKey}
                variant={best ? "default" : "outline"}
                size="lg"
                className="mt-6 w-full"
              >
                {pending === key && <Loader2 className="animate-spin" />}
                {clientKey ? `${p.credits}건 결제하기` : "결제 준비 중"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
