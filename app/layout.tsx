import type { Metadata } from "next";
import { Geist_Mono, Hahmlet } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OPEN_GRAPH_BASE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, TWITTER_BASE } from "@/lib/site";
// 본문: Pretendard (한글을 92조각으로 나눈 파일이라 화면에 쓰인 글자만 내려받는다)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

// 제목: 얇은 굵기의 현대적인 한글 세리프. 한글 글꼴은 글자 수가 많아 미리 불러오지 않는다(preload: false).
const hahmlet = Hahmlet({
  variable: "--font-hahmlet",
  weight: ["200", "300", "400"],
  preload: false,
  display: "swap",
});

// 작은 라벨(FIG. 01, Q 04 / 10 같은 글자): 고정폭
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

// 사이트 공통 정보 (lib/site.ts). 대표 주소(canonical)는 화면마다 달라서 각 화면에서 정한다.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: OPEN_GRAPH_BASE,
  twitter: TWITTER_BASE,
  // 구글 서치 콘솔 사이트 소유 확인 (구글 로그인 브랜드 인증에 필요)
  verification: { google: "QNvlDg01g5qZ-k-AqYKH7DMcGIs0PoLPEuT-viW9lXc" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${hahmlet.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <Toaster position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
