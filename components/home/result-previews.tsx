"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Download, QrCode } from "lucide-react";
import { Momo } from "@/components/momo";

// 홈 "결과 미리보기". 위 탭 다섯 개가 차례로 넘어가며, 왼쪽에 설명, 오른쪽에 실제 화면을 줄여 꾸민 예시를 보여 준다.
// 커서를 올리면 멈추고, 탭을 누르면 그 탭부터 다시 돈다. 예시 내용은 "동네 헬스장 출석 체크 앱" 하나로 맞춘다.
const DURATION = 6000;

type Tab = { tab: string; title: string; desc: string; points: string[]; stage: () => ReactNode };

const TABS: Tab[] = [
  {
    tab: "정리된 내용",
    title: "막연한 아이디어도\n빠진 곳 없이 정리돼요",
    desc: "질문에 답하다 보면 대상 사용자부터 디자인 톤까지 9가지 항목이 채워져요. 모르는 건 추천 답변을 고르면 돼요.",
    points: ["9가지 항목을 하나씩 확인", "잘 모르겠으면 추천 답변으로", "고칠 곳만 말하면 다시 정리"],
    stage: SummaryStage,
  },
  {
    tab: "PRD.md",
    title: "무엇을 왜 만드는지\n한 장의 기획서로",
    desc: "정리한 내용을 개요, 핵심 기능, 화면 목록, 데이터 구조까지 9개 장으로 나눠 AI가 읽기 좋은 기획서로 만들어요.",
    points: ["핵심 기능에 번호를 붙여 정리", "만들지 않을 것까지 적어 범위를 좁혀요", "복사하거나 zip으로 받기"],
    stage: PrdStage,
  },
  {
    tab: "TASKS.md",
    title: "한 단계씩 그대로\n붙여 넣는 작업 순서",
    desc: "개발 순서를 단계로 나누고, 단계마다 AI 코딩 도구에 붙여 넣을 프롬프트와 직접 확인하는 방법을 적어 드려요.",
    points: ["단계마다 붙여 넣을 프롬프트", "끝났는지 직접 확인하는 방법", "다 한 단계는 체크해 두기"],
    stage: TasksStage,
  },
  {
    tab: "CLAUDE.md",
    title: "AI가 먼저 읽는\n프로젝트 안내서",
    desc: "기술 스택, 폴더 구조, 지켜야 할 작업 규칙을 한 파일에 담아요. 프로젝트 폴더에 넣어 두면 AI가 매번 먼저 읽어요.",
    points: ["기술 스택과 폴더 구조", "한 번에 한 단계만 작업하는 규칙", "비밀 키를 지키는 규칙"],
    stage: ClaudeStage,
  },
  {
    tab: "화면 미리보기",
    title: "만들기 전에\n화면부터 눌러 보세요",
    desc: "PRD를 바탕으로 직접 눌러 볼 수 있는 웹앱을 만들어요. 가짜 데이터로 움직이고, HTML로 받아 디자인 참고로 쓸 수 있어요.",
    points: ["크레딧 1건으로 만들기", "디자인 5가지 중 PRD에 맞는 톤", "HTML 파일로 받기"],
    stage: PreviewStage,
  },
];

export function ResultPreviews() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // 탭을 누르거나 커서가 떠나면 막대를 처음부터 다시 채운다
  const [cycle, setCycle] = useState(0);
  const [still, setStill] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    const timer = setTimeout(sync, 0);
    media.addEventListener("change", sync);
    return () => {
      clearTimeout(timer);
      media.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (paused || still) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % TABS.length), DURATION);
    return () => clearTimeout(timer);
  }, [index, paused, still, cycle]);

  // 휴대폰처럼 탭 줄이 옆으로 넘칠 때 지금 탭이 보이게 가로로만 밀어 준다
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = tabsRef.current;
    const btn = box?.querySelectorAll<HTMLElement>("[role=tab]")[index];
    if (box && btn) box.scrollTo({ left: btn.offsetLeft - 16, behavior: "smooth" });
  }, [index]);

  const current = TABS[index];
  const Stage = current.stage;

  return (
    <section
      className="relative z-10 mt-16 md:mt-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setCycle((c) => c + 1);
      }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
            <span className="mono-label rounded-full border border-line-strong px-2 py-0.5 text-foreground">Preview</span>
            &ldquo;무엇을 받게 되나요?&rdquo;
          </p>
          <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,36px)] font-light tracking-[-0.03em]">
            답하고, 확인하고, 붙여 넣으면 끝
          </h2>
        </div>
        <div ref={tabsRef} className="relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="결과 미리보기" className="flex w-max gap-1 rounded-full border bg-background p-1">
            {TABS.map((t, i) => (
              <button
                key={t.tab}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => {
                  setIndex(i);
                  setCycle((c) => c + 1);
                }}
                className={
                  "relative h-9 rounded-full px-4 text-[13px] transition-colors " +
                  (i === index ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:text-foreground")
                }
              >
                {t.tab}
                {i === index && !still && (
                  <span
                    key={`${index}-${cycle}`}
                    aria-hidden
                    className="absolute inset-x-4 -bottom-[7px] h-[2px] origin-left rounded-full bg-foreground"
                    style={{
                      animation: `tab-progress ${DURATION}ms linear both`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-[clamp(24px,5vw,72px)]">
        <div key={`text-${index}`} role="tabpanel" aria-label={current.tab} className="rise [animation-duration:700ms]">
          <p className="mono-label text-muted-foreground">
            0{index + 1} / 0{TABS.length}
          </p>
          <p className="mt-3 whitespace-pre-line font-display text-[clamp(24px,2.8vw,32px)] font-light leading-[1.3] tracking-[-0.03em]">
            {current.title}
          </p>
          <p className="mt-4 max-w-[420px] break-keep text-[14.5px] leading-[1.75] text-muted-foreground">{current.desc}</p>
          <ul className="mt-6 max-w-[420px] border-t text-[13.5px]">
            {current.points.map((p, i) => (
              <li key={p} className="flex gap-3 border-b py-3">
                <span className="font-mono text-[11px] leading-[1.9] text-muted-foreground">{i + 1}</span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="grid min-h-[400px] place-items-center rounded-[24px] bg-muted px-4 py-8 sm:px-10">
          <div key={`stage-${index}`} className="w-full max-w-[460px]">
            <Stage />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 오른쪽 예시 화면들 ─────────────────────────────

const card = "rounded-2xl border bg-background shadow-[0_12px_32px_-20px_rgba(0,0,0,0.25)]";

function Rise({ delay = 0, className = "", children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <div className={`rise [animation-duration:700ms] ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function SummaryStage() {
  const rows: [string, string][] = [
    ["대상 사용자 · 회원과 관장님", "완료"],
    ["핵심 기능 · QR 출석, 기록 보기", "완료"],
    ["저장할 데이터 · 회원, 출석 기록", "완료"],
    ["외부 연동 · 카카오톡 알림", "추천으로 채움"],
  ];
  return (
    <div className="space-y-3">
      <Rise className={`${card} w-[86%] px-3.5 py-2.5`}>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Momo className="size-3" /> MOMO
        </p>
        <p className="mt-1 text-[12.5px]">회원권이 끝나 갈 때 알림도 보낼까요?</p>
      </Rise>
      <Rise delay={200} className="ml-auto w-fit rounded-2xl bg-foreground px-3.5 py-2.5 text-[12.5px] text-background">
        잘 모르겠어요. 추천해 주세요.
      </Rise>
      <Rise delay={400} className={`${card} p-4`}>
        <div className="flex items-baseline justify-between">
          <p className="text-[13.5px] font-semibold">정리된 내용</p>
          <span className="font-mono text-[11px] text-muted-foreground">7 / 9</span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {rows.map(([label, state], i) => (
            <Rise key={label} delay={550 + i * 120} className="flex items-center gap-2.5 text-[12.5px]">
              <span className="size-2 rounded-full bg-foreground" />
              {label}
              <span className={"ml-auto text-[11px] " + (i === 3 ? "font-medium text-foreground" : "text-muted-foreground")}>
                {state}
              </span>
            </Rise>
          ))}
        </ul>
      </Rise>
    </div>
  );
}

function PrdStage() {
  const toc = ["1. 개요", "2. 대상 사용자", "3. 핵심 기능", "4. 사용자 흐름", "5. 화면 목록", "6. 데이터 구조"];
  const features = [
    ["F1", "QR 출석 체크", "회원이 입구 QR을 찍으면 출석이 기록된다"],
    ["F2", "출석 기록 보기", "관장님이 날짜·회원별로 기록을 본다"],
    ["F3", "회원권 만료 알림", "끝나기 3일 전 카카오톡으로 알린다"],
  ];
  return (
    <Rise className={`${card} overflow-hidden`}>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="font-mono text-[12px]">PRD.md</span>
        <span className="flex gap-1.5 text-muted-foreground">
          <span className="grid size-6 place-items-center rounded-md border"><Copy className="size-3" /></span>
          <span className="grid size-6 place-items-center rounded-md border"><Download className="size-3" /></span>
        </span>
      </div>
      <div className="grid grid-cols-[110px_1fr]">
        <ul className="space-y-2 border-r px-3 py-4 text-[11.5px] text-muted-foreground">
          {toc.map((t) => (
            <li key={t} className={t.startsWith("3") ? "font-medium text-foreground" : ""}>
              {t}
            </li>
          ))}
          <li>…</li>
        </ul>
        <div className="px-4 py-4">
          <p className="text-[14px] font-semibold">3. 핵심 기능</p>
          <ul className="mt-3 space-y-3">
            {features.map(([no, name, desc], i) => (
              <Rise key={no} delay={250 + i * 150}>
                <p className="text-[12.5px]">
                  <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">{no}</span>
                  {name}
                </p>
                <p className="mt-0.5 break-keep text-[11.5px] leading-[1.6] text-muted-foreground">{desc}</p>
              </Rise>
            ))}
          </ul>
        </div>
      </div>
    </Rise>
  );
}

function TasksStage() {
  const steps = ["프로젝트 만들기", "로그인 붙이기", "QR 출석 체크", "출석 기록 화면", "만료 알림"];
  return (
    <Rise className="overflow-hidden rounded-2xl bg-[#111] text-[#e8e8e6] shadow-[0_16px_40px_-20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5">
          <i className="size-2 rounded-full bg-white/20" />
          <i className="size-2 rounded-full bg-white/20" />
          <i className="size-2 rounded-full bg-white/20" />
        </span>
        <span className="ml-1 font-mono text-[11.5px] text-white/50">docs/TASKS.md</span>
      </div>
      <div className="grid grid-cols-[124px_1fr]">
        <ul className="space-y-2 border-r border-white/10 px-3 py-4 text-[11.5px]">
          {steps.map((s, i) => (
            <li key={s} className={"flex items-center gap-1.5 " + (i === 2 ? "text-white" : "text-white/45")}>
              {i < 2 ? <Check className="size-3 text-white/70" /> : <span className="w-3 text-center font-mono text-[10px]">{i + 1}</span>}
              {s}
            </li>
          ))}
        </ul>
        <div className="px-4 py-4 font-mono text-[11px] leading-[1.75]">
          <p className="text-white/45"># 3단계. QR 출석 체크</p>
          <Rise delay={200}>
            <p className="mt-2 text-white/45">목표:</p>
            <p className="break-keep">QR을 찍으면 오늘 출석이 저장된다</p>
          </Rise>
          <Rise delay={400}>
            <p className="mt-2 text-white/45">프롬프트:</p>
            <p className="break-keep rounded-md bg-white/[0.06] px-2 py-1.5">
              docs/PRD.md의 F1을 만들어 줘. 먼저 계획을 설명하고 확인을 받아.
            </p>
          </Rise>
          <Rise delay={600}>
            <p className="mt-2 text-white/45">완료 확인:</p>
            <p className="break-keep">휴대폰으로 QR을 찍고 기록 화면에서 확인</p>
          </Rise>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2.5 font-mono text-[10.5px] text-white/50">
        진행
        <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-2/5 rounded-full bg-white/80" />
        </span>
        2 / 5
      </div>
    </Rise>
  );
}

function ClaudeStage() {
  const stack = ["Next.js", "Supabase", "Tailwind CSS", "카카오 알림톡"];
  const rules = [
    "한 번에 한 단계만 작업한다 (docs/TASKS.md 순서)",
    "코드를 고치기 전에 계획부터 설명한다",
    "비밀 키는 .env.local 에만 둔다",
    "출석 기록 쓰기는 서버에서만 한다",
  ];
  return (
    <Rise className={`${card} p-4`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px]">CLAUDE.md</span>
        <span className="rounded-full border px-2 py-0.5 text-[10.5px] text-muted-foreground">프로젝트 폴더 맨 위</span>
      </div>
      <p className="mt-4 text-[12px] font-semibold">기술 스택</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {stack.map((s, i) => (
          <Rise key={s} delay={150 + i * 80} className="rounded-md bg-muted px-2 py-1 font-mono text-[11px]">
            {s}
          </Rise>
        ))}
      </div>
      <p className="mt-4 text-[12px] font-semibold">작업 규칙</p>
      <ul className="mt-2 space-y-2">
        {rules.map((r, i) => (
          <Rise key={r} delay={500 + i * 150} className="flex items-start gap-2 text-[12px] leading-[1.6]">
            <Check className="mt-[3px] size-3 shrink-0" />
            {r}
          </Rise>
        ))}
      </ul>
    </Rise>
  );
}

function PreviewStage() {
  const kits = ["잡지형", "앱형", "업무형", "포스터형", "어두운 고급형"];
  return (
    <div className="space-y-3">
      <Rise className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <span className="flex gap-1">
            <i className="size-1.5 rounded-full bg-paper-3" />
            <i className="size-1.5 rounded-full bg-paper-3" />
            <i className="size-1.5 rounded-full bg-paper-3" />
          </span>
          <span className="mx-auto rounded-full bg-muted px-3 py-0.5 text-[10.5px] text-muted-foreground">미리보기 · 홈</span>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold">짐체크</span>
            <span className="flex gap-3 text-[10.5px] text-muted-foreground">
              <span>홈</span>
              <span>기록</span>
              <span>요금</span>
            </span>
          </div>
          <Rise delay={200} className="mt-4 rounded-xl bg-[#f3efe6] p-4">
            <p className="text-[11px] text-muted-foreground">오늘 출석</p>
            <p className="mt-0.5 text-[26px] font-bold leading-none tracking-tight">128명</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[11px] text-background">
              <QrCode className="size-3" /> QR로 출석하기
            </span>
          </Rise>
          <div className="mt-3 space-y-1.5">
            {["김하늘 · 07:12", "박서준 · 07:30", "이도윤 · 08:05"].map((r, i) => (
              <Rise key={r} delay={400 + i * 120} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-[11px]">
                {r}
                <Check className="size-3 text-muted-foreground" />
              </Rise>
            ))}
          </div>
        </div>
      </Rise>
      <Rise delay={700} className="flex items-center gap-1.5 overflow-hidden">
        {kits.map((k, i) => (
          <span
            key={k}
            className={
              "shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] " +
              (i === 1 ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground")
            }
          >
            {k}
          </span>
        ))}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10.5px] text-muted-foreground">
          <Download className="size-3" /> HTML 받기
        </span>
      </Rise>
    </div>
  );
}
