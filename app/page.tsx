import { BlackHole } from "@/components/black-hole";
import { IdeaComposer } from "@/components/home/idea-composer";
import { SiteFooter } from "@/components/site-footer";

const STEPS = [
  { no: "01 — 질문", title: "질문에 답하기", desc: "기획에 빠진 부분을 하나씩 물어봐요.\n잘 모르겠으면 추천 답변을 고르면 돼요." },
  { no: "02 — 확인", title: "정리된 내용 확인하기", desc: "대상 사용자부터 디자인 톤까지 9가지 항목을 보고,\n고칠 부분만 말해주세요." },
  { no: "03 — 문서", title: "문서 세 개 받기", desc: "PRD.md · TASKS.md · CLAUDE.md를 복사하거나 zip으로 받아요." },
];

const glow = "[text-shadow:0_0_28px_#fff,0_0_8px_#fff]";

// 첫 화면: 큰 제목 두 줄 사이로 블랙홀이 돌고, 아래에 입력창. 로그인 없이 바로 입력 (PRD F1).
export default function HomePage() {
  return (
    <>
      <main className="relative w-full overflow-x-clip">
        <div className="mx-auto w-full max-w-[1280px] px-4 pt-2 sm:px-8 lg:px-12">
          <section className="relative flex h-[clamp(300px,44svh,380px)] flex-col min-[521px]:h-[clamp(420px,calc(100svh-330px),600px)]">
            <BlackHole className="absolute -top-6 left-1/2 h-[calc(100%+4rem)] w-screen -translate-x-1/2" />
            <p className="rise relative z-10 inline-flex h-8 items-center gap-2.5 self-start rounded-full border border-line-strong bg-background/70 py-0 pl-1 pr-3.5 text-[12.5px] text-ink-2 backdrop-blur-sm">
              <span className="rounded-full bg-foreground px-2 py-1 font-mono text-[10px] font-medium tracking-[0.06em] text-background">
                NEW
              </span>
              <span>
                질문형 PRD 생성기<span className="hidden sm:inline"> · 클로드 코드 · 커서용</span>
              </span>
            </p>
            <h1 className="display-title relative z-10 grid flex-1 grid-rows-[auto_1fr_auto] pt-3 text-[clamp(26px,7vw,92px)] min-[521px]:pt-[18px]">
              <span className={`rise justify-self-start [animation-delay:80ms] ${glow}`}>아이디어 한 줄로 시작해서,</span>
              <span className={`rise row-start-3 justify-self-end pb-1 text-right [animation-delay:180ms] ${glow}`}>
                개발에 바로 쓰는 기획서까지.
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
            <p className="rise order-2 text-[15px] leading-[1.8] text-ink-2 [animation-delay:320ms] md:order-none md:max-w-[360px] md:text-base">
              MOMO의 질문에 답하면, 클로드 코드나 커서에 그대로 붙여넣을 수 있는{" "}
              <b className="font-semibold text-foreground">기획서(PRD), 작업 목록, CLAUDE.md 파일</b>을 만들어 드려요.
              <span className="mono-label mt-4 block text-muted-foreground">
                기획서를 무료로 3번 만들어볼 수 있어요
              </span>
            </p>
            <div className="rise [animation-delay:440ms]">
              <IdeaComposer />
            </div>
          </section>

          <ol className="relative z-10 mt-12 grid border-t md:mt-[72px] md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.no}
                className={
                  "border-b py-[18px] pb-[22px] md:border-b-0 md:pb-9 md:pt-5 " +
                  (i > 0 ? "md:border-l md:pl-6 " : "") +
                  (i < STEPS.length - 1 ? "md:pr-6" : "")
                }
              >
                <span className="mono-label text-muted-foreground">{step.no}</span>
                <p className="mt-3.5 font-display text-[22px] font-light leading-snug tracking-[-0.02em]">{step.title}</p>
                <p className="mt-1.5 whitespace-pre-line break-keep text-[13.5px] leading-[1.7] text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
