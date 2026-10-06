"use client";

import { useState } from "react";
import { ChevronDown, Circle, CircleCheck, CircleDashed } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

function StatusIcon({ status }: { status: CoverageStatus }) {
  if (status === "done") return <CircleCheck className="size-4 shrink-0 text-brand" aria-label="채워짐" />;
  if (status === "partial") return <CircleDashed className="size-4 shrink-0 text-amber-500" aria-label="일부" />;
  return <Circle className="size-4 shrink-0 text-muted-foreground/40" aria-label="비어 있음" />;
}

export function ProgressLine({ coverage, questionCount, finalCheck }: Omit<Props, "title" | "summary">) {
  const filled = filledAreaCount(coverage);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{finalCheck ? "최종 확인 중" : `질문 ${Math.min(questionCount, MAX_QUESTIONS)}/${MAX_QUESTIONS}`}</span>
        <span>
          채워진 영역 {filled}/{AREA_KEYS.length}
        </span>
      </div>
      <Progress value={(filled / AREA_KEYS.length) * 100} className="h-1.5" />
    </div>
  );
}

export function AreaList({ summary, coverage }: Pick<Props, "summary" | "coverage">) {
  return (
    <ul className="space-y-3">
      {AREA_KEYS.map((key) => (
        <li key={key} className="flex gap-2.5">
          <StatusIcon status={coverage[key]} />
          <div className="min-w-0 -mt-0.5">
            <p className="text-xs font-medium text-muted-foreground">{AREA_LABELS[key]}</p>
            <p className={cn("text-sm leading-6", !summary[key] && "text-muted-foreground/60")}>
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
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-brand">아이디어 요약</p>
        <h2 className="mt-1 text-lg font-semibold leading-snug">{summary.title || props.title}</h2>
        {summary.one_liner && <p className="mt-1 text-sm text-muted-foreground">{summary.one_liner}</p>}
      </div>
      <ProgressLine coverage={props.coverage} questionCount={props.questionCount} finalCheck={props.finalCheck} />
      <AreaList summary={summary} coverage={props.coverage} />
      {summary.final_changes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">최종 확인에서 추가·수정한 내용</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
            {summary.final_changes.map((c, i) => (
              <li key={i}>{c}</li>
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
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-l bg-card/50 px-5 py-6 lg:block xl:w-96">
      <PanelBody {...props} />
    </aside>
  );
}

// 모바일: 상단 접이식
export function MobileSummary(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b bg-card/70 lg:hidden">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{props.summary.title || props.title}</p>
          <ProgressLine coverage={props.coverage} questionCount={props.questionCount} finalCheck={props.finalCheck} />
        </div>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-[55dvh] overflow-y-auto px-4 pb-4">
        <PanelBody {...props} />
      </CollapsibleContent>
    </Collapsible>
  );
}
