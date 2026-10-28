"use client";

import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown, splitHeadingNumber } from "@/components/markdown";
import { PRODUCTS, REWRITES_PER_CREDIT, type DocKind } from "@/lib/domain";
import { cn } from "@/lib/utils";

// 실제 내용이 아닌 "생김새"만 보여 주는 흐린 미리보기
const SAMPLE: Record<Exclude<DocKind, "prd">, string> = {
  tasks: `# 작업 단계

> 한 단계씩 순서대로 클로드 코드에 붙여 넣고 완료 확인을 한 뒤 다음 단계로 넘어가세요.

## 1단계. 프로젝트 만들기와 규칙 파일
- **목표:** 빈 폴더에서 프로젝트를 만들고 첫 화면을 띄운다
- **프롬프트:** docs/PRD.md와 CLAUDE.md를 먼저 읽어. Next.js 프로젝트를 만들고 …
- **완료 확인:** 브라우저에서 첫 화면이 뜬다

## 2단계. 화면 뼈대
- **목표:** PRD 5장의 화면을 가짜 데이터로 모두 만든다
- **프롬프트:** docs/PRD.md와 CLAUDE.md를 먼저 읽어. 화면 목록대로 …
- **완료 확인:** 모든 화면을 클릭으로 이동할 수 있다

## 3단계. 로그인과 데이터베이스
- **목표:** 로그인하고 내 데이터만 보이게 한다
- **프롬프트:** …`,
  claude_md: `# 프로젝트 이름

## 프로젝트 개요
- 무엇을, 누구를 위해 만드는지 …
- 자세한 내용은 docs/PRD.md, 진행 순서는 docs/TASKS.md

## 기술 스택
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (DB·로그인)

## 작업 규칙
- 한 번에 한 단계만 작업한다
- 코드를 고치기 전에 계획부터 설명한다
- …`,
};

// 잠긴 PRD 장은 제목만 안다. 흐린 미리보기는 그 제목에 빈 줄만 붙인다.
function prdSample(titles: string[]) {
  return titles
    .slice(0, 3)
    .map((t) => `## ${t}\n1. 이 장의 내용은 잠금 해제 후에 보여요 …\n2. …………………………\n3. ……………`)
    .join("\n\n");
}

function chapterNos(titles: string[]) {
  const nos = titles.map((t) => splitHeadingNumber(t.replace(/[*_`]/g, ""))?.no);
  return nos.every(Boolean) ? (nos as string[]) : null;
}

// "4~9장" (번호가 없으면 "6개 장")
export function lockedChapterRange(titles: string[]) {
  const nos = chapterNos(titles);
  if (!nos) return `${titles.length}개 장`;
  const [first, last] = [Number(nos[0]), Number(nos[nos.length - 1])];
  return first === last ? `${first}장` : `${first}~${last}장`;
}

export function LockedPreview({
  kind,
  prdLocked,
  credits,
  projectId,
  onUnlock,
  busy,
  isDeveloper = false,
}: {
  kind: DocKind;
  // 잠긴 PRD 장 제목. 비어 있으면 PRD 는 이미 다 보이는 프로젝트(미리보기 전에 만든 PRD)
  prdLocked: string[];
  credits: number;
  projectId: string;
  onUnlock: () => void;
  busy: boolean;
  // 개발자 계정은 크레딧과 상관없이 바로 연다 (서버에서도 차감하지 않음)
  isDeveloper?: boolean;
}) {
  const withPrd = prdLocked.length > 0;
  const nos = chapterNos(prdLocked);
  const prdPerk = nos ? `PRD ${lockedChapterRange(prdLocked)}` : `PRD 나머지 ${lockedChapterRange(prdLocked)}`;
  const perks = [
    ...(withPrd ? [{ label: prdPerk, meta: `${prdLocked.length} sections` }] : []),
    { label: "작업 단계 8~15개 + CLAUDE.md", meta: "2 files" },
    { label: "한 번에 끝까지 만드는 원샷 프롬프트", meta: "+ 1" },
    { label: "세 파일 한 번에 받기", meta: ".zip" },
    { label: "섹션 다시 쓰기", meta: `× ${REWRITES_PER_CREDIT}` },
  ];
  const description =
    kind === "prd"
      ? `화면 목록, 데이터 구조, 기술 스택까지 PRD 나머지 ${prdLocked.length}개 장과 클로드 코드에 붙여 넣을 작업 단계·CLAUDE.md를 함께 열어요.`
      : withPrd
        ? `크레딧 1건으로 ${prdPerk}과 단계별 프롬프트, 규칙 파일(CLAUDE.md)을 함께 열어요.`
        : "클로드 코드에 순서대로 붙여 넣기만 하면 되는 단계별 프롬프트와 규칙 파일을 만들어 드려요.";

  return (
    <div
      className={cn(
        "relative",
        withPrd ? "min-h-[780px] sm:min-h-[720px]" : "min-h-[640px]",
        kind === "prd" && "mt-14",
      )}
    >
      <div aria-hidden className="pointer-events-none select-none opacity-45 blur-[7px]">
        <Markdown>{kind === "prd" ? prdSample(prdLocked) : SAMPLE[kind]}</Markdown>
      </div>
      <div className="absolute inset-x-0 top-9 flex justify-center px-1 sm:top-16">
        <div className="w-full max-w-[460px] rounded-[20px] border border-foreground bg-background px-5 pb-[22px] pt-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.35)] sm:px-[30px] sm:pb-[26px] sm:pt-[30px]">
          <p className="mono-label flex items-center gap-2 text-muted-foreground">
            <Lock className="size-3" /> Locked
            {kind === "prd" && nos && ` · ${nos[0]} — ${nos[nos.length - 1]}`}
          </p>
          <h3 className="mt-3.5 break-keep font-display text-[25px] font-light leading-tight tracking-[-0.03em] sm:text-[28px]">
            {withPrd ? "PRD 나머지와 작업 단계 열기" : "작업 단계와 CLAUDE.md 열기"}
          </h3>
          <p className="mt-2 break-keep text-sm leading-relaxed text-muted-foreground">{description}</p>
          {kind === "prd" && (
            <ul aria-label="잠긴 장" className="mt-4 flex flex-wrap gap-1.5">
              {prdLocked.map((title) => {
                const parts = splitHeadingNumber(title.replace(/[*_`]/g, ""));
                return (
                  <li
                    key={title}
                    className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-line-strong px-2.5 text-[12.5px] text-ink-2"
                  >
                    {parts && <span className="font-mono text-[10px] text-muted-foreground">{parts.no}</span>}
                    {parts?.rest ?? title.replace(/[*_`]/g, "")}
                  </li>
                );
              })}
            </ul>
          )}
          <ul className="mb-[22px] mt-5 border-t">
            {perks.map((p) => (
              <li key={p.label} className="flex justify-between gap-3 border-b py-[11px] text-sm">
                <span>{p.label}</span>
                <span className="mono-label whitespace-nowrap text-[10.5px] text-muted-foreground">{p.meta}</span>
              </li>
            ))}
          </ul>
          {busy ? (
            <Button disabled size="lg" className="h-12 w-full">
              <Loader2 className="animate-spin" /> 작업 단계를 만드는 중이에요
            </Button>
          ) : isDeveloper ? (
            <Button onClick={onUnlock} size="lg" className="h-12 w-full">
              바로 열기 — 크레딧 무제한
            </Button>
          ) : credits > 0 ? (
            <Button onClick={onUnlock} size="lg" className="h-12 w-full">
              크레딧 1건으로 열기 — 남은 크레딧 {credits}
            </Button>
          ) : (
            <Button asChild size="lg" className="h-12 w-full">
              <Link href={`/credits?next=${encodeURIComponent(`/p/${projectId}`)}`}>
                크레딧 구매하기 · 1건 {PRODUCTS.credit_1.amount.toLocaleString()}원
              </Link>
            </Button>
          )}
          <p className="mono-label mt-3 text-center text-[10px] text-ink-4">
            {busy && withPrd
              ? "CLAUDE.md가 만들어지면 PRD 나머지도 바로 열려요"
              : isDeveloper
                ? "개발자 계정은 크레딧이 차감되지 않아요"
                : "문서 생성에 실패하면 크레딧은 차감되지 않아요"}
          </p>
        </div>
      </div>
    </div>
  );
}
