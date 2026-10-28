import Link from "next/link";
import { BUSINESS_FIELDS } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto">
      <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mono-label text-muted-foreground">
          <span>© MIYA STUDIO</span>
          <Link href="/pricing" className="hover:text-foreground">
            요금 안내
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            이용약관
          </Link>
          {/* 개인정보처리방침은 다른 링크와 구분되게 진하게 (개인정보 처리방침 작성지침) */}
          <Link href="/privacy" className="font-medium text-foreground">
            개인정보처리방침
          </Link>
          <Link href="/refund" className="hover:text-foreground">
            환불정책
          </Link>
        </div>
        {/* 사업자 정보 (전자상거래법 표시 의무) */}
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] leading-[1.7] text-muted-foreground">
          {BUSINESS_FIELDS.map((f) => (
            <span key={f.label} className="break-keep">
              {f.label} {f.value}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
