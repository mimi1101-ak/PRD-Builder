"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readJsonError } from "@/lib/ndjson";

type State =
  | { kind: "loading" }
  | { kind: "ok"; credits: number; creditsAdded: number; already: boolean }
  | { kind: "error"; message: string };

export function ConfirmPayment({
  paymentKey,
  orderId,
  amount,
  next,
}: {
  paymentKey: string;
  orderId: string;
  amount: string;
  next: string;
}) {
  const missing = !paymentKey || !orderId || !amount;
  const [state, setState] = useState<State>(
    missing
      ? { kind: "error", message: "결제 정보가 없어요. 크레딧 화면에서 다시 시도해 주세요." }
      : { kind: "loading" },
  );
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (missing) return;
    void (async () => {
      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        if (!res.ok) {
          setState({ kind: "error", message: (await readJsonError(res)).message });
          return;
        }
        const data = (await res.json()) as { credits: number; creditsAdded: number; alreadyProcessed?: boolean };
        setState({
          kind: "ok",
          credits: data.credits,
          creditsAdded: data.creditsAdded,
          already: !!data.alreadyProcessed,
        });
      } catch {
        setState({ kind: "error", message: "연결이 끊겼어요. 새로고침하면 다시 확인해요 (중복 결제되지 않아요)." });
      }
    })();
  }, [paymentKey, orderId, amount, missing]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-[20px] border px-7 pb-7 pt-8 text-center">
        {state.kind === "loading" && (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-foreground" />
            <p className="mt-3 font-medium">결제를 확인하고 있어요…</p>
            <p className="mt-1 text-sm text-muted-foreground">창을 닫지 말고 잠시만 기다려 주세요.</p>
          </>
        )}
        {state.kind === "ok" && (
          <>
            <CircleCheck className="mx-auto size-9 text-foreground" />
            <p className="mt-4 font-display text-2xl font-light tracking-[-0.03em]">
              {state.already ? "이미 처리된 결제예요" : `크레딧 ${state.creditsAdded}건이 충전됐어요`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">남은 크레딧 {state.credits}건</p>
            <Button asChild className="mt-6 w-full">
              {/* 헤더의 크레딧 숫자도 새로 그리도록 전체 이동 */}
              <a href={next}>{next.startsWith("/p/") ? "프로젝트로 돌아가기" : "확인"}</a>
            </Button>
          </>
        )}
        {state.kind === "error" && (
          <>
            <CircleX className="mx-auto size-9 text-destructive" />
            <p className="mt-4 font-display text-2xl font-light tracking-[-0.03em]">결제를 완료하지 못했어요</p>
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href={`/credits?next=${encodeURIComponent(next)}`}>크레딧 화면으로</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
