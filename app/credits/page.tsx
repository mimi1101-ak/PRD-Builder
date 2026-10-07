import Link from "next/link";
import { getViewer, safeNextPath } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { BuyButtons } from "@/components/credits/buy-buttons";
import { LoginButtons } from "@/components/login-buttons";
import { SiteFooter } from "@/components/site-footer";
import { FREE_DAILY_GENERATIONS, REWRITES_PER_CREDIT } from "@/lib/domain";

export const metadata = { title: "크레딧" };

type PaymentRow = { order_id: string; amount: number; credits_added: number; status: string; created_at: string };

const PAYMENT_STATUS: Record<string, string> = {
  ready: "결제 대기",
  done: "완료",
  failed: "실패",
  canceled: "취소",
};

export default async function CreditsPage(props: PageProps<"/credits">) {
  const searchParams = await props.searchParams;
  const next = safeNextPath(typeof searchParams.next === "string" ? searchParams.next : null, "/credits");
  const viewer = await getViewer();

  if (!viewer.userId) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-[20px] border px-7 pb-7 pt-8 text-center">
          <p className="mono-label text-muted-foreground">Credits</p>
          <h1 className="display-title mt-2 text-[40px]">크레딧</h1>
          <p className="mt-3 text-sm text-muted-foreground">크레딧을 확인하고 충전하려면 로그인해 주세요.</p>
          <LoginButtons
            next={`/credits${next !== "/credits" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="mt-6"
          />
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const [{ data: profile }, { data: payments }] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", viewer.userId).maybeSingle(),
    supabase
      .from("payments")
      .select("order_id, amount, credits_added, status, created_at")
      .in("status", ["done", "canceled"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <>
      <main className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-10 sm:px-8">
        <p className="mono-label text-muted-foreground">Credits</p>
        <h1 className="display-title mt-3 text-[clamp(36px,5vw,56px)]">크레딧</h1>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-y py-7">
          <div>
            <p className="mono-label text-muted-foreground">남은 크레딧</p>
            <p className="mt-2 font-display text-7xl font-extralight leading-none tracking-[-0.05em]">
              {profile?.credits ?? 0}
              <span className="ml-2 font-sans text-lg font-normal tracking-normal text-muted-foreground">건</span>
            </p>
          </div>
          {next !== "/credits" && (
            <Link href={next} className="text-sm font-medium underline-offset-4 hover:underline">
              프로젝트로 돌아가기 →
            </Link>
          )}
        </div>

        <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">충전하기</h2>
        <BuyButtons next={next} />

        <div className="mt-8 space-y-1 border-t pt-5 text-sm leading-6 text-muted-foreground">
          <p>
            <b className="text-foreground">크레딧 1건</b> = 프로젝트 1개의 작업 단계 + CLAUDE.md 열람, 세 파일 zip
            다운로드, 섹션 다시 쓰기 {REWRITES_PER_CREDIT}회. 한 번 연 프로젝트는 계속 볼 수 있어요.
          </p>
          <p className="mt-1">
            <b className="text-foreground">무료</b>: 아이디어 인터뷰는 무제한, PRD 열람·복사는 언제나 무료예요 (PRD
            생성은 하루 {FREE_DAILY_GENERATIONS}회).
          </p>
          <p className="mt-1">
            결제는 토스페이먼츠로 안전하게 처리돼요. 현재 테스트 모드에서는 실제 돈이 나가지 않아요.
          </p>
        </div>

        {payments && payments.length > 0 && (
          <>
            <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">결제 내역</h2>
            <ul className="border-t text-sm">
              {(payments as PaymentRow[]).map((p) => (
                <li key={p.order_id} className="flex items-center justify-between gap-3 border-b py-3.5">
                  <span className="text-muted-foreground">
                    {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(
                      new Date(p.created_at),
                    )}
                  </span>
                  <span>크레딧 {p.credits_added}건</span>
                  <span>{p.amount.toLocaleString()}원</span>
                  <span className="text-muted-foreground">{PAYMENT_STATUS[p.status] ?? p.status}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
