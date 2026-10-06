import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// 한글 글꼴은 글자 수가 많아 미리 불러오지 않는다(preload: false).
const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  weight: ["400", "500", "700"],
  preload: false,
  display: "swap",
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-noto-serif",
  weight: ["500", "700"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PRD 빌더 — 질문에 답하면 PRD가 완성돼요",
    template: "%s · PRD 빌더",
  },
  description:
    "아이디어 한 줄을 넣으면 질문 5~10개로 빈 곳을 채운 뒤, 클로드 코드에 바로 넣을 수 있는 PRD·작업 단계·CLAUDE.md를 만들어 드려요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSans.variable} ${notoSerif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
