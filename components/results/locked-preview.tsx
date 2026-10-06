"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
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
}: {
  kind: Exclude<DocKind, "prd">;
  credits: number;
  projectId: string;
  onUnlock: () => void;
  busy: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card">
      <div aria-hidden className="pointer-events-none select-none p-6 blur-[5px]">
        <Markdown>{SAMPLE[kind]}</Markdown>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/40 p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-lg">
          <Lock className="mx-auto size-6 text-brand" />
          <h3 className="mt-3 text-lg font-semibold">작업 단계와 CLAUDE.md 열기</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            클로드 코드에 순서대로 붙여 넣기만 하면 되는 단계별 프롬프트와 규칙 파일을 만들어 드려요.
          </p>
          <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left text-sm">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" /> 작업 단계 8~15개 + CLAUDE.md
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" /> 세 파일 한 번에 받기 (zip)
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" /> 섹션 다시 쓰기 {REWRITES_PER_CREDIT}회
            </li>
          </ul>
          {credits > 0 ? (
            <Button
              onClick={onUnlock}
              disabled={busy}
              className="mt-5 h-10 w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            >
              크레딧 1건으로 열기 (남은 크레딧 {credits}건)
            </Button>
          ) : (
            <Button asChild className="mt-5 h-10 w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href={`/credits?next=${encodeURIComponent(`/p/${projectId}`)}`}>
                크레딧 구매하기 · 1건 {PRODUCTS.credit_1.amount.toLocaleString()}원
              </Link>
            </Button>
          )}
          <p className="mt-2 text-xs text-muted-foreground">문서 생성에 실패하면 크레딧은 차감되지 않아요.</p>
        </div>
      </div>
    </div>
  );
}
