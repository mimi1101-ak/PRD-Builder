"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AREA_KEYS,
  AREA_LABELS,
  MAX_QUESTIONS,
  filledAreaCount,
  type Coverage,
  type CoverageStatus,
  type IdeaSummary,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  summary: IdeaSummary;
  coverage: Coverage;
  questionCount: number;
  finalCheck: boolean;
};

const STATUS_LABEL: Record<CoverageStatus, string> = { done: "채워짐", partial: "일부", empty: "비어 있음" };

// 채워짐 ■ / 일부 ◩ / 비어 있음 □
function StatusMark({ status }: { status: CoverageStatus }) {
  return (
    <span
      role="img"
      aria-label={STATUS_LABEL[status]}
      className={cn(
        "mt-1.5 size-[9px] shrink-0 border",
        status === "done" && "border-foreground bg-foreground",
        status === "partial" && "border-foreground bg-[linear-gradient(135deg,var(--foreground)_50%,transparent_50%)]",
        status === "empty" && "border-ink-4",
      )}
    />
  );
}

// 영역마다 한 칸: 채워짐은 검정, 일부는 빗금, 비어 있음은 회색
export function AreaSegments({ coverage, className }: { coverage: Coverage; className?: string }) {
  return (
    <div className={cn("grid gap-[3px]", className)} style={{ gridTemplateColumns: `repeat(${AREA_KEYS.length}, 1fr)` }}>
      {AREA_KEYS.map((key) => (
        <i
          key={key}
          className={cn(
            "h-1.5 bg-paper-3",
            coverage[key] === "done" && "bg-foreground",
            coverage[key] === "partial" &&
              "bg-[repeating-linear-gradient(135deg,var(--foreground)_0_1.5px,transparent_1.5px_4.5px)]",
          )}
        />
      ))}
    </div>
  );
}

export function ProgressLine({ coverage, questionCount, finalCheck }: Omit<Props, "title" | "summary">) {
  const filled = filledAreaCount(coverage);
  return (
    <div>
      <div className="mono-label mb-2.5 flex items-center justify-between text-muted-foreground">
        <span>
          {finalCheck ? (
            "최종 확인 중"
          ) : (
            <>
              질문 <b className="font-medium text-foreground">{Math.min(questionCount, MAX_QUESTIONS)}</b>/{MAX_QUESTIONS}
            </>
          )}
        </span>
        <span>
          채워진 영역 <b className="font-medium text-foreground">{filled}</b>/{AREA_KEYS.length}
        </span>
      </div>
      <AreaSegments coverage={coverage} />
    </div>
  );
}

export function AreaList({ summary, coverage }: Pick<Props, "summary" | "coverage">) {
  return (
    <ul>
      {AREA_KEYS.map((key, i) => (
        <li key={key} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-t py-3.5">
          <StatusMark status={coverage[key]} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>
              {AREA_LABELS[key]}
            </p>
            <p className={cn("mt-0.5 text-sm leading-[1.65]", !summary[key] && "text-ink-4")}>
              {summary[key] || "아직 정하지 않았어요"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PanelBody(props: Props) {
  const { summary } = props;
  return (
    <div>
      <p className="mono-label text-muted-foreground">Idea summary</p>
      <h2 className="mt-3 font-display text-[30px] font-light leading-tight tracking-[-0.035em]">
        {summary.title || props.title}
      </h2>
      {summary.one_liner && <p className="mt-1.5 text-sm text-muted-foreground">{summary.one_liner}</p>}
      <div className="mt-7">
        <ProgressLine coverage={props.coverage} questionCount={props.questionCount} finalCheck={props.finalCheck} />
      </div>
      <div className="mt-6">
        <AreaList summary={summary} coverage={props.coverage} />
      </div>
      {summary.final_changes.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">최종 확인에서 추가·수정한 내용</p>
          <ul className="mt-2 space-y-1 text-sm">
            {summary.final_changes.map((c, i) => (
              <li key={i} className="relative pl-5 before:absolute before:left-0 before:text-ink-4 before:content-['—']">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// PC: 오른쪽 고정 패널
export function SummaryPanel(props: Props) {
  return (
    <aside className="relative z-10 hidden w-[380px] shrink-0 overflow-y-auto border-l bg-background/75 px-[30px] pb-10 pt-[30px] lg:block">
      <PanelBody {...props} />
    </aside>
  );
}

// 모바일: 상단 접이식
export function MobileSummary(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="relative z-10 border-b bg-background/85 lg:hidden">
      <CollapsibleTrigger className="mx-auto flex w-full max-w-[760px] items-center gap-3 px-4 py-2.5 text-left sm:px-8">
        <span className="mono-label shrink-0 text-muted-foreground">
          채워진 영역 {filledAreaCount(props.coverage)}/{AREA_KEYS.length}
        </span>
        <AreaSegments coverage={props.coverage} className="flex-1 [&_i]:h-1" />
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
        <span className="sr-only">아이디어 요약 {open ? "접기" : "펼치기"}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mx-auto max-h-[55dvh] max-w-[760px] overflow-y-auto px-4 pb-4 sm:px-8">
        <PanelBody {...props} />
      </CollapsibleContent>
    </Collapsible>
  );
}
