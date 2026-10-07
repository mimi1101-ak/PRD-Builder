"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, Copy, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { parseTaskSteps, splitSections, type Section, type TaskStep } from "@/lib/markdown";
import { cn } from "@/lib/utils";

async function copyText(text: string, onDone: () => void) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("복사했어요");
    onDone();
  } catch {
    toast.error("복사하지 못했어요. 직접 선택해 복사해 주세요.");
  }
}

export function CopyButton({
  text,
  label = "복사",
  size = "sm",
  variant = "ghost",
  className,
}: {
  text: string;
  label?: string;
  size?: "sm" | "xs";
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={() =>
        void copyText(text, () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? <Check /> : <Copy />}
      {label}
    </Button>
  );
}

export type RewriteTarget = { heading: string; title: string };

// 문서 본문. 잠금 해제된 프로젝트면 "## 섹션"마다 다시 쓰기 버튼을 붙인다.
export function DocBody({ content, onRewrite }: { content: string; onRewrite?: (target: RewriteTarget) => void }) {
  const parts = useMemo(() => {
    const sections = splitSections(content);
    const lines = content.split("\n");
    const head = lines.slice(0, sections[0]?.start ?? lines.length).join("\n");
    return {
      head,
      sections: sections.map((s) => ({ section: s, text: lines.slice(s.start, s.end).join("\n") })),
    };
  }, [content]);

  if (!onRewrite || parts.sections.length === 0) return <Markdown>{content}</Markdown>;

  return (
    <div>
      {parts.head.trim() && <Markdown>{parts.head}</Markdown>}
      {parts.sections.map(({ section, text }) => (
        <SectionBlock key={section.start} section={section} text={text} onRewrite={onRewrite} />
      ))}
    </div>
  );
}

function SectionBlock({
  section,
  text,
  onRewrite,
}: {
  section: Section;
  text: string;
  onRewrite: (target: RewriteTarget) => void;
}) {
  return (
    <div className="group relative mt-14">
      <div className="absolute right-0 top-0 z-10 opacity-100 transition-opacity focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
        <Button
          size="xs"
          variant="ghost"
          className="bg-background"
          onClick={() => onRewrite({ heading: section.heading, title: section.title })}
        >
          <PenLine /> 다시 쓰기
        </Button>
      </div>
      <Markdown className="[&_h2]:pr-24">{text}</Markdown>
    </div>
  );
}

// 작업 단계 체크 상태는 이 브라우저(localStorage)에 저장한다.
const CHECKS_EVENT = "prd-builder:checks";

function subscribeChecks(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHECKS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHECKS_EVENT, onChange);
  };
}

function readChecks(key: string) {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]"; // 저장소를 쓸 수 없으면 체크 상태만 기억하지 않는다
  }
}

function writeChecks(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 무시
  }
  window.dispatchEvent(new Event(CHECKS_EVENT));
}

export function stepAnchor(n: number) {
  return `step-${n}`;
}

// 작업 단계: 단계별 카드 + 체크박스
export function TaskSteps({
  projectId,
  content,
  onRewrite,
}: {
  projectId: string;
  content: string;
  onRewrite?: (target: RewriteTarget) => void;
}) {
  const parsed = useMemo(() => parseTaskSteps(content), [content]);
  const storageKey = `prd-builder:tasks:${projectId}`;
  const raw = useSyncExternalStore(
    subscribeChecks,
    () => readChecks(storageKey),
    () => "[]",
  );
  const checked = useMemo(() => {
    try {
      const value = JSON.parse(raw) as unknown;
      return Array.isArray(value) ? value.filter((x): x is number => typeof x === "number") : [];
    } catch {
      return [];
    }
  }, [raw]);

  function toggle(n: number) {
    const next = checked.includes(n) ? checked.filter((x) => x !== n) : [...checked, n];
    writeChecks(storageKey, JSON.stringify(next));
  }

  if (!parsed) return <DocBody content={content} onRewrite={onRewrite} />;

  const total = parsed.steps.length;
  const doneCount = parsed.steps.filter((s) => checked.includes(s.number)).length;
  return (
    <div>
      {parsed.intro && <Markdown className="[&_blockquote]:border-l-0 [&_blockquote]:pl-0">{parsed.intro}</Markdown>}
      <div className="mt-6 flex items-center gap-[18px]">
        <span className="mono-label shrink-0 text-muted-foreground">
          진행 {doneCount} / {total}
        </span>
        <div
          className="grid flex-1 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-label="작업 단계 진행"
        >
          {parsed.steps.map((s) => (
            <i key={s.number} className={cn("h-1.5 bg-paper-3", checked.includes(s.number) && "bg-foreground")} />
          ))}
        </div>
      </div>
      <div className="mt-7">
        {parsed.steps.map((step) => (
          <StepCard
            key={step.heading}
            step={step}
            checked={checked.includes(step.number)}
            onToggle={() => toggle(step.number)}
            onRewrite={onRewrite}
          />
        ))}
      </div>
    </div>
  );
}

function StepCard({
  step,
  checked,
  onToggle,
  onRewrite,
}: {
  step: TaskStep;
  checked: boolean;
  onToggle: () => void;
  onRewrite?: (target: RewriteTarget) => void;
}) {
  const title = step.heading.replace(/^##\s+/, "");
  const [copied, setCopied] = useState(false);
  return (
    <section
      id={stepAnchor(step.number)}
      className="grid scroll-mt-20 gap-2.5 border-t py-9 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5"
    >
      <div className={cn("font-display text-[44px] font-extralight leading-[0.85] tracking-[-0.05em] sm:text-[60px]", checked && "text-ink-4")}>
        {String(step.number).padStart(2, "0")}
        <span className="mono-label ml-2.5 align-middle text-[10px] text-ink-4 sm:ml-0 sm:mt-3.5 sm:block">Step</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className={cn("text-[19px] font-semibold leading-[1.45] tracking-[-0.02em]", checked && "text-muted-foreground line-through decoration-1")}>
              {step.title}
            </h3>
            {step.goal && <p className="mt-1.5 text-[14.5px] text-muted-foreground">{step.goal}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            {onRewrite && (
              <Button size="xs" variant="ghost" onClick={() => onRewrite({ heading: step.heading, title })}>
                <PenLine /> 다시 쓰기
              </Button>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-[13px] text-muted-foreground has-checked:text-foreground">
              <input
                type="checkbox"
                checked={checked}
                onChange={onToggle}
                aria-label={`${step.number}단계 완료`}
                className="peer sr-only"
              />
              <span className="grid size-4 place-items-center border border-muted-foreground peer-checked:border-foreground peer-checked:bg-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/30">
                <Check className="size-3 text-background" strokeWidth={3} />
              </span>
              완료
            </label>
          </div>
        </div>
        {step.prompt && (
          <div className="relative mt-[18px] rounded-[14px] bg-foreground px-[22px] py-5 text-[#e9e9e6]">
            <p className="mono-label mb-2.5 text-[10px] text-[#8b8b87]">Prompt</p>
            <button
              type="button"
              onClick={() =>
                void copyText(step.prompt, () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                })
              }
              className="mono-label absolute right-3.5 top-3.5 inline-flex h-7 items-center gap-1.5 rounded-full border border-white/25 px-3 text-[10px] text-white transition-colors hover:bg-white hover:text-foreground"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "복사됨" : "프롬프트 복사"}
            </button>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.85]">
              {step.prompt}
            </pre>
          </div>
        )}
        {step.check && (
          <p className="mt-3.5 text-sm text-ink-2">
            <b className="font-semibold text-foreground">완료 확인</b> — {step.check}
          </p>
        )}
      </div>
    </section>
  );
}
