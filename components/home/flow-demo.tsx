"use client";

import { ArrowUp } from "lucide-react";
import { Momo } from "@/components/momo";
import { useTypewriter } from "@/components/home/use-typewriter";

// 홈 "사용 흐름". 위에 단계 네 개, 아래에 실제 화면처럼 꾸민 작은 창(왼쪽 대화, 오른쪽 진행 상황).
// 입력창에는 사용자가 답을 치는 모습이 돌아가며 나온다. 장식이라 화면 읽기 도구에는 설명 한 줄만 읽힌다.
const STEPS = ["아이디어 말하기", "질문에 답하기", "정리된 내용 확인하기", "문서 받기"];

const ANSWERS = ["회원권 끝나기 3일 전에 알려 주세요.", "알림은 카카오톡으로 보내 주세요.", "잘 모르겠어요. 추천해 주세요."];

const PROGRESS: { label: string; state: "done" | "now" | "wait"; note: string }[] = [
  { label: "아이디어 듣기", state: "done", note: "완료" },
  { label: "빠진 부분 질문", state: "now", note: "4 / 7" },
  { label: "정리된 내용 확인", state: "wait", note: "대기" },
  { label: "PRD · TASKS · CLAUDE.md 만들기", state: "wait", note: "대기" },
];

const TABS = ["진행 상황", "정리된 내용", "문서", "화면 미리보기"];

export function FlowDemo() {
  const typed = useTypewriter(ANSWERS);

  return (
    <section className="relative z-10 mt-20 md:mt-32">
      <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 text-[13px] text-ink-2">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden className="hidden h-px w-6 bg-line-strong sm:block" />}
            <span className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-foreground font-mono text-[10.5px] font-medium text-background">
                {i + 1}
              </span>
              {step}
            </span>
          </li>
        ))}
      </ol>

      <p className="sr-only">
        예시 화면: 왼쪽에서 MOMO의 질문에 답하고, 오른쪽에서 기획이 어디까지 채워졌는지 볼 수 있어요.
      </p>
      <div
        aria-hidden
        className="mx-auto mt-7 max-w-[1040px] overflow-hidden rounded-[20px] border bg-background shadow-[0_24px_60px_-28px_rgba(0,0,0,0.18)]"
      >
        <div className="flex h-11 items-center gap-3 border-b px-4">
          <span className="flex gap-1.5">
            <i className="size-2 rounded-full bg-paper-3" />
            <i className="size-2 rounded-full bg-paper-3" />
            <i className="size-2 rounded-full bg-paper-3" />
          </span>
          <span className="text-[13px] font-medium">동네 헬스장 출석 체크 앱</span>
        </div>

        <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* 왼쪽: 대화 */}
          <div className="flex min-h-[340px] flex-col justify-end gap-3 bg-muted p-4 md:min-h-[380px] md:border-r">
            <p className="ml-auto max-w-[88%] break-keep rounded-2xl border bg-background px-3.5 py-2.5 text-[13px] leading-[1.65]">
              동네 헬스장 출석 체크 앱을 만들고 싶어요. 회원은 QR로 출석하고, 관장님은 기록을 보면 좋겠어요.
            </p>
            <div className="max-w-[88%] rounded-2xl border bg-background px-3.5 py-2.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                <Momo className="size-3.5" />
                MOMO
              </p>
              <p className="mt-1 break-keep text-[13px] leading-[1.65]">
                좋아요. 회원 출석, QR 체크, 출석 기록 보기로 정리했어요. 회원권이 끝나 갈 때 알림도 보낼까요?
              </p>
            </div>
            <div className="mt-1 flex h-[88px] flex-col justify-between rounded-2xl border border-line-strong bg-background p-3">
              <p className="text-[13px] leading-[1.6]">
                {typed}
                <span className="ml-px inline-block h-[1.05em] w-px translate-y-[2px] animate-pulse bg-foreground" />
              </p>
              <span className="grid size-7 place-items-center self-end rounded-full bg-foreground text-background">
                <ArrowUp className="size-3.5" />
              </span>
            </div>
          </div>

          {/* 오른쪽: 진행 상황 */}
          <div className="border-t p-4 md:border-t-0 md:px-6">
            <div className="flex gap-5 overflow-hidden border-b text-[12.5px] text-muted-foreground">
              {TABS.map((tab, i) => (
                <span
                  key={tab}
                  className={
                    "shrink-0 pb-2.5 " + (i === 0 ? "-mb-px border-b-2 border-foreground font-medium text-foreground" : "")
                  }
                >
                  {tab}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[15px] font-semibold tracking-tight">기획 진행 상황</p>
            <p className="mt-1 text-[12px] text-muted-foreground">아이디어부터 문서까지 순서대로 채워져요</p>
            <ul className="relative mt-5 space-y-3.5 before:absolute before:bottom-2 before:left-[4px] before:top-2 before:w-px before:bg-line-strong">
              {PROGRESS.map((p) => (
                <li key={p.label} className="relative flex items-center gap-3 text-[13px]">
                  <span
                    className={
                      "relative size-[9px] shrink-0 rounded-full " +
                      (p.state === "done"
                        ? "bg-foreground"
                        : p.state === "now"
                          ? "border-2 border-foreground bg-background"
                          : "border border-line-strong bg-background")
                    }
                  />
                  <span className={p.state === "wait" ? "text-muted-foreground" : ""}>{p.label}</span>
                  <span
                    className={
                      "ml-auto font-mono text-[11px] " + (p.state === "now" ? "text-foreground" : "text-muted-foreground")
                    }
                  >
                    {p.note}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 break-keep rounded-lg bg-muted px-3.5 py-2.5 text-[12px] leading-[1.65] text-ink-2">
              질문이 끝나면 대상 사용자부터 디자인 톤까지 9가지 항목으로 정리해서 보여 드려요.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
