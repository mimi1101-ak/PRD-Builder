import type { Metadata } from "next";
import { BlackHole } from "@/components/black-hole";
import { FlowDemo } from "@/components/home/flow-demo";
import { IdeaComposer } from "@/components/home/idea-composer";
import { IdeaExamples } from "@/components/home/idea-examples";
import { ResultPreviews } from "@/components/home/result-previews";
import { SiteFooter } from "@/components/site-footer";
import { OPEN_GRAPH_BASE } from "@/lib/site";

// 제목·설명은 레이아웃의 기본값을 쓰고, 대표 주소와 공유 주소만 정한다
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...OPEN_GRAPH_BASE, url: "/" },
};

const glow = "[text-shadow:0_0_28px_#fff,0_0_8px_#fff]";

// 첫 화면: 큰 제목 두 줄 사이로 블랙홀이 돌고, 아래에 입력창. 로그인 없이 바로 입력 (PRD F1).
export default function HomePage() {
  return (
    <>
      <main className="relative w-full overflow-x-clip">
        <div className="mx-auto w-full max-w-[1280px] px-4 pt-2 sm:px-8 lg:px-12">
          <section className="relative flex h-[clamp(300px,44svh,380px)] flex-col min-[521px]:h-[clamp(420px,calc(100svh-330px),600px)]">
            <BlackHole className="absolute -top-6 left-1/2 h-[calc(100%+4rem)] w-screen -translate-x-1/2" />
            <h1 className="display-title relative z-10 grid flex-1 grid-rows-[auto_1fr_auto] pt-3 text-[clamp(26px,7vw,92px)] min-[521px]:pt-[18px]">
              <span className={`rise justify-self-start [animation-delay:80ms] ${glow}`}>흩어진 아이디어를,</span>
              <span className={`rise row-start-3 justify-self-end pb-1 text-right [animation-delay:180ms] ${glow}`}>
                AI가 알아듣는 설계도로
              </span>
            </h1>
            <p className="rise mono-label absolute right-0 top-[42%] z-10 hidden text-right leading-[1.7] text-muted-foreground [animation-delay:320ms] md:block">
              <b className="font-medium text-foreground">PRD. 01</b>
              <br />
              흩어진 점이 모여
              <br />
              만들어지는 당신만의 행성
            </p>
          </section>

          <section className="relative z-10 grid items-end gap-5 pt-5 min-[521px]:pt-9 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-[clamp(24px,6vw,112px)]">
            <div className="rise order-2 break-keep text-[15px] leading-[1.8] text-ink-2 [animation-delay:320ms] md:order-none md:max-w-[360px] md:text-base">
              <p className="text-center text-[13px] font-semibold text-muted-foreground">&ldquo;PRD가 무엇인가요?&rdquo;</p>
              <p className="mt-3">
                집을 지을 때 설계도부터 그리듯, 서비스에도 설계도가 필요해요. 그게{" "}
                <b className="font-semibold text-foreground">PRD(제품 요구사항 정의서)</b>예요.
              </p>
              <p className="mt-2">
                설계도 없이 AI에게 맡기면 매번 다른 집이 지어지거든요. MOMO의 질문에 답하면 클로드 코드·커서에 바로 넣을 수
                있는 <b className="font-semibold text-foreground">PRD, 작업 목록, CLAUDE.md 파일</b>을 만들어 드려요.
              </p>
            </div>
            <div className="rise [animation-delay:440ms]">
              <IdeaComposer />
            </div>
          </section>

          <FlowDemo />

          <ResultPreviews />
          <IdeaExamples />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
