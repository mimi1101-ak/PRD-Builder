import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { getViewer } from "@/lib/access";
import { PRODUCTS, REWRITES_PER_CREDIT, type ProductKey } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const metadata = { title: "요금 안내" };

// 로그인 없이 볼 수 있는 상품 안내 (결제 심사: 상품 이미지·금액·상세·제공 기간·환불 정책 노출).
// 금액은 lib/domain.ts 의 PRODUCTS 를 그대로 쓴다.
const IMAGES: Record<ProductKey, string> = {
  credit_1: "/products/credit-1.svg",
  credit_5: "/products/credit-5.svg",
};

const INCLUDED = [
  "TASKS.md(작업 단계) 열람",
  "CLAUDE.md 열람",
  "PRD.md · TASKS.md · CLAUDE.md zip 다운로드",
  `섹션 다시 쓰기 ${REWRITES_PER_CREDIT}회`,
];

const DETAILS: { label: string; value: string }[] = [
  { label: "상품 형태", value: "온라인 디지털 콘텐츠 이용권(크레딧). 배송 없음" },
  { label: "제공 내용", value: "크레딧 1건으로 프로젝트 1개를 잠금 해제해요. " + INCLUDED.join(", ") },
  { label: "제공 시점", value: "결제 승인 즉시 계정에 크레딧이 지급돼요" },
  {
    label: "서비스 제공 기간",
    value: "크레딧은 따로 정한 사용 기한이 없어요. 잠금 해제한 프로젝트는 서비스가 운영되는 동안 계속 볼 수 있어요",
  },
  { label: "결제 수단", value: "신용·체크카드 (토스페이먼츠)" },
];

export default async function PricingPage() {
  const viewer = await getViewer();
  const buyHref = viewer.userId ? "/credits" : "/login?next=%2Fcredits";

  return (
    <>
      <main className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-10 sm:px-8">
        <p className="mono-label text-muted-foreground">Pricing</p>
        <h1 className="display-title mt-3 text-[clamp(36px,5vw,56px)]">요금 안내</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          인터뷰와 PRD 생성은 무료예요. 작업 단계(TASKS.md)와 CLAUDE.md를 열 때 크레딧을 써요.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(Object.keys(PRODUCTS) as ProductKey[]).map((key) => {
            const p = PRODUCTS[key];
            const best = key === "credit_5";
            return (
              <div key={key} className={cn("overflow-hidden rounded-[20px] border", best && "border-foreground")}>
                <Image
                  src={IMAGES[key]}
                  alt={`${p.name} 상품 이미지`}
                  width={800}
                  height={600}
                  className="aspect-[4/3] w-full object-cover"
                  unoptimized
                />
                <div className="p-6">
                  <p className="font-medium">{p.name}</p>
                  <p className="mt-2 font-display text-4xl font-extralight tracking-[-0.04em]">
                    {p.amount.toLocaleString()}원
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    크레딧 {p.credits}건 · 건당 {Math.round(p.amount / p.credits).toLocaleString()}원
                  </p>
                  <ul className="mt-4 space-y-1 text-sm text-ink-2">
                    <li>프로젝트 {p.credits}개 잠금 해제</li>
                    {INCLUDED.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                  <Button asChild variant={best ? "default" : "outline"} size="lg" className="mt-6 w-full">
                    <Link href={buyHref}>구매하기</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">상품 정보</h2>
        <dl className="border-t text-sm">
          {DETAILS.map((d) => (
            <div key={d.label} className="grid gap-1 border-b py-3.5 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd className="break-keep">{d.value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">무료로 쓸 수 있는 것</h2>
        <ul className="space-y-1 text-sm leading-6 text-ink-2">
          <li>· MOMO와의 아이디어 인터뷰 (횟수 제한 없음)</li>
          <li>· PRD.md 생성과 열람·복사</li>
        </ul>

        <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">환불 정책</h2>
        <ul className="space-y-1 text-sm leading-6 text-ink-2">
          <li>· 결제 후 7일 이내, 크레딧을 쓰지 않았다면 전액 환불해요.</li>
          <li>· 5건 묶음에서 일부만 썼다면, 결제 금액에서 쓴 건수 × 3,900원을 뺀 금액을 환불해요.</li>
          <li>· 7일이 지난 뒤에는 결제일로부터 1년 이내에 남은 크레딧을 10% 공제 후 환불해요.</li>
          <li>
            · 이미 쓴 크레딧(잠금 해제한 프로젝트)과 무료로 받은 크레딧은 환불되지 않아요. 서비스 오류로 이용하지 못했다면
            전액 돌려드려요.
          </li>
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/refund" className="underline underline-offset-4 hover:text-muted-foreground">
            환불정책 전문 보기
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
