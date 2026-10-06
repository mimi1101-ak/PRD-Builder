"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, Copy, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { parseTaskSteps, splitSections, type Section, type TaskStep } from "@/lib/markdown";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "복사",
  size = "sm",
  variant = "outline",
}: {
  text: string;
  label?: string;
  size?: "sm" | "xs";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("복사했어요");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사하지 못했어요. 직접 선택해 복사해 주세요.");
    }
  }
  return (
    <Button type="button" size={size} variant={variant} onClick={copy}>
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
    <div className="group relative">
      <div className="absolute right-0 top-7 z-10 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
        <Button
          size="xs"
          variant="secondary"
          onClick={() => onRewrite({ heading: section.heading, title: section.title })}
        >
          <PenLine /> 다시 쓰기
        </Button>
      </div>
      <Markdown>{text}</Markdown>
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

  const doneCount = parsed.steps.filter((s) => checked.includes(s.number)).length;
  return (
    <div className="space-y-4">
      {parsed.intro && <Markdown className="prose-h1:mb-2">{parsed.intro}</Markdown>}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          진행 {doneCount}/{parsed.steps.length}단계
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(doneCount / parsed.steps.length) * 100}%` }}
          />
        </div>
      </div>
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
  return (
    <div className={cn("rounded-xl border bg-card p-4 transition-colors", checked && "bg-muted/40")}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`${step.number}단계 완료`}
          className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={cn("font-semibold", checked && "text-muted-foreground line-through")}>
              {step.number}단계. {step.title}
            </h3>
            {onRewrite && (
              <Button size="xs" variant="ghost" onClick={() => onRewrite({ heading: step.heading, title })}>
                <PenLine /> 다시 쓰기
              </Button>
            )}
          </div>
          {step.goal && <p className="mt-1 text-sm text-muted-foreground">목표: {step.goal}</p>}
          <div className="relative mt-3">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-900 p-3 pr-20 text-[13px] leading-6 text-neutral-100">
              {step.prompt}
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton text={step.prompt} label="프롬프트 복사" size="xs" variant="secondary" />
            </div>
          </div>
          {step.check && (
            <p className="mt-2 text-sm">
              <span className="font-medium">완료 확인:</span> {step.check}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
