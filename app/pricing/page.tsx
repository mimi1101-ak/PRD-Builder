import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { getViewer } from "@/lib/access";
import { BUSINESS } from "@/lib/business";
import { BEST_PRODUCT, PRODUCTS, REWRITES_PER_CREDIT, type ProductKey } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const metadata = { title: "요금 안내" };

// 로그인 없이 볼 수 있는 상품 안내 (결제 심사: 상품 이미지·금액·상세·제공 기간·환불 정책 노출).
// 금액은 lib/domain.ts 의 PRODUCTS 를 그대로 쓴다.
const IMAGES: Record<ProductKey, string> = {
  credit_1: "/products/credit-1.svg",
  credit_3: "/products/credit-3.svg",
  credit_5: "/products/credit-5.svg",
};

const INCLUDED = [
  "TASKS.md(작업 단계) 열람",
  "CLAUDE.md 열람",
  "PRD.md · TASKS.md · CLAUDE.md zip 다운로드",
  `섹션 다시 쓰기 ${REWRITES_PER_CREDIT}회`,
];

// 한 줄씩 나눠 보여 준다
const DETAILS: { label: string; lines: string[] }[] = [
  { label: "상품 형태", lines: ["온라인 이용권(크레딧)", "배송 없음"] },
  {
    label: "제공 내용",
    lines: [
      "크레딧 1건으로 프로젝트 1개 잠금 해제",
      "작업 단계 문서 보기 (TASKS.md)",
      "AI 코딩 도구용 안내서 보기 (CLAUDE.md)",
      "문서 3개 한 번에 내려받기 (PRD.md · TASKS.md · CLAUDE.md, zip 파일)",
      `섹션 다시 쓰기 ${REWRITES_PER_CREDIT}회`,
    ],
  },
  { label: "제공 시점", lines: ["결제가 끝나면 바로 계정에 크레딧 지급"] },
  {
    label: "서비스 제공 기간",
    lines: ["크레딧 사용 기한 없음", "잠금 해제한 프로젝트는 서비스 운영 기간 내내 계속 보기 가능"],
  },
  { label: "결제 수단", lines: ["신용·체크카드 (토스페이먼츠)"] },
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

        {/* 상품마다 가로 한 줄: 왼쪽 이미지, 오른쪽 이름·가격·구매 */}
        <div className="mt-8 space-y-3">
          {(Object.keys(PRODUCTS) as ProductKey[]).map((key) => {
            const p = PRODUCTS[key];
            const best = key === BEST_PRODUCT;
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col overflow-hidden rounded-[20px] border sm:flex-row",
                  best && "border-foreground",
                )}
              >
                <Image
                  src={IMAGES[key]}
                  alt={`${p.name} 상품 이미지`}
                  width={800}
                  height={600}
                  className="aspect-[4/3] w-full shrink-0 object-cover sm:w-[200px]"
                  unoptimized
                />
                <div className="flex flex-1 flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <div>
                    <p className="font-medium">
                      dot.PRD {p.title}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        프로젝트 {p.credits}개 잠금 해제
                      </span>
                    </p>
                    <p className="mt-1 font-display text-4xl font-extralight tracking-[-0.04em]">
                      {p.amount.toLocaleString()}원
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      크레딧 {p.credits}건 · 건당 {Math.round(p.amount / p.credits).toLocaleString()}원
                    </p>
                  </div>
                  <Button asChild variant={best ? "default" : "outline"} size="lg" className="w-full sm:w-36">
                    <Link href={buyHref}>구매하기</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm leading-6 text-ink-2">
          <span className="text-muted-foreground">모든 상품 · 프로젝트마다</span> {INCLUDED.join(" · ")}
        </p>

        <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">상품 정보</h2>
        <dl className="border-t text-sm">
          {DETAILS.map((d) => (
            <div key={d.label} className="grid gap-1 border-b py-3.5 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd className="space-y-1 break-keep">
                {d.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">무료로 사용 가능한 기능</h2>
        <ul className="space-y-1 text-sm leading-6 text-ink-2">
          <li>· MOMO와의 아이디어 인터뷰 (횟수 제한 없음)</li>
          <li>· PRD.md 생성과 열람·복사</li>
        </ul>

        <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">환불 정책</h2>
        <ul className="space-y-1 text-sm leading-6 text-ink-2">
          <li>· 환불은 결제 후 7일 이내에 이메일({BUSINESS.email})로 신청해 주세요. 7일이 지나면 환불되지 않아요.</li>
          <li>· 크레딧을 쓰지 않았다면 전액 환불해요.</li>
          <li>· 3건·5건 묶음에서 일부만 썼다면, 결제 금액에서 쓴 건수 × 3,900원을 뺀 금액을 환불해요.</li>
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
