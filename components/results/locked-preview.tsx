"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { PRODUCTS, REWRITES_PER_CREDIT, type DocKind } from "@/lib/domain";

// 실제 내용이 아닌 "생김새"만 보여 주는 흐린 미리보기
const SAMPLE: Record<Exclude<DocKind, "prd">, string> = {
  tasks: `# 작업 단계

> 한 단계씩 순서대로 클로드 코드에 붙여 넣고, 완료 확인을 한 뒤 다음 단계로 넘어가세요.

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

export function LockedPreview({
  kind,
  credits,
  projectId,
  onUnlock,
  busy,
  isDeveloper = false,
}: {
  kind: Exclude<DocKind, "prd">;
  credits: number;
  projectId: string;
  onUnlock: () => void;
  busy: boolean;
  // 개발자 계정은 크레딧과 상관없이 바로 연다 (서버에서도 차감하지 않음)
  isDeveloper?: boolean;
}) {
  const perks = [
    { label: "작업 단계 8~15개 + CLAUDE.md", meta: "2 files" },
    { label: "한 번에 끝까지 만드는 원샷 프롬프트", meta: "+ 1" },
    { label: "세 파일 한 번에 받기", meta: ".zip" },
    { label: "섹션 다시 쓰기", meta: `× ${REWRITES_PER_CREDIT}` },
  ];
  return (
    <div className="relative min-h-[640px]">
      <div aria-hidden className="pointer-events-none select-none opacity-45 blur-[7px]">
        <Markdown>{SAMPLE[kind]}</Markdown>
      </div>
      <div className="absolute inset-x-0 top-16 flex justify-center px-1 sm:top-24">
        <div className="w-full max-w-[460px] rounded-[20px] border border-foreground bg-background px-[30px] pb-[26px] pt-[30px] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.35)]">
          <p className="mono-label flex items-center gap-2 text-muted-foreground">
            <Lock className="size-3" /> Locked
          </p>
          <h3 className="mt-3.5 font-display text-[28px] font-light leading-tight tracking-[-0.03em]">
            작업 단계와 CLAUDE.md 열기
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            클로드 코드에 순서대로 붙여 넣기만 하면 되는 단계별 프롬프트와 규칙 파일을 만들어 드려요.
          </p>
          <ul className="mb-[22px] mt-5 border-t">
            {perks.map((p) => (
              <li key={p.label} className="flex justify-between gap-3 border-b py-[11px] text-sm">
                <span>{p.label}</span>
                <span className="mono-label text-[10.5px] text-muted-foreground">{p.meta}</span>
              </li>
            ))}
          </ul>
          {isDeveloper ? (
            <Button onClick={onUnlock} disabled={busy} size="lg" className="h-12 w-full">
              바로 열기 — 크레딧 무제한
            </Button>
          ) : credits > 0 ? (
            <Button onClick={onUnlock} disabled={busy} size="lg" className="h-12 w-full">
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
            {isDeveloper ? "개발자 계정은 크레딧이 차감되지 않아요" : "문서 생성에 실패하면 크레딧은 차감되지 않아요"}
          </p>
        </div>
      </div>
    </div>
  );
}
