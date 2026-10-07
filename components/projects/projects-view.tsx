"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectMenu } from "@/components/projects/project-menu";
import { ProjectUniverse } from "@/components/projects/project-universe";
import { PROJECTS_VIEW_COOKIE, PROJECT_STATUS_LABELS, type ProjectStatus, type ProjectsViewMode } from "@/lib/domain";
import { cn } from "@/lib/utils";

export type ProjectItem = {
  id: string;
  title: string;
  status: ProjectStatus;
  unlocked: boolean;
  date: string;
  href: string;
};

// 고른 보기를 1년간 기억 (서버가 다음 방문 때 같은 보기로 그린다)
function rememberView(view: ProjectsViewMode) {
  document.cookie = `${PROJECTS_VIEW_COOKIE}=${view}; path=/; max-age=31536000; samesite=lax`;
}

// 내 프로젝트: 우주 보기(행성) ↔ 목록 보기(번잡한 걸 싫어하는 사용자용)
export function ProjectsView({
  items,
  initialView,
  notice,
}: {
  items: ProjectItem[];
  initialView: ProjectsViewMode;
  notice?: ReactNode;
}) {
  const [view, setView] = useState(initialView);
  const space = view === "space";

  function choose(next: ProjectsViewMode) {
    setView(next);
    rememberView(next);
  }

  return (
    // data-universe 가 있으면 페이지 전체가 어두운 우주 테마가 된다 (globals.css)
    <main className="relative flex-1 pb-16" data-universe={space ? "" : undefined}>
      <div className={cn("relative z-[1] mx-auto w-full px-4 sm:px-8", space ? "max-w-[1320px] pt-8" : "max-w-[880px] pt-10")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono-label text-muted-foreground">
              Projects{space && ` · 행성 ${items.length}개`}
            </p>
            <h1 className="display-title mt-3 text-[clamp(36px,5vw,56px)]">내 프로젝트</h1>
            {space && <p className="mt-2.5 text-sm text-muted-foreground">기획서를 하나 만들 때마다 우주에 행성이 하나씩 생겨요.</p>}
          </div>
          <div className="flex items-center gap-2.5">
            <div role="radiogroup" aria-label="보기 방식" className="inline-flex rounded-full border border-line-strong p-[3px]">
              {(
                [
                  ["space", "우주", <PixelPlanetIcon key="i" />],
                  ["list", "목록", <List key="i" className="size-3.5" />],
                ] as const
              ).map(([value, label, icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={view === value}
                  onClick={() => choose(value)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground aria-checked:bg-foreground aria-checked:text-background"
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
            <Button asChild>
              <Link href="/">
                <Plus /> 새 아이디어
              </Link>
            </Button>
          </div>
        </div>
        {notice}
      </div>

      {space ? (
        <ProjectUniverse items={items} />
      ) : (
        <div className="mx-auto w-full max-w-[880px] px-4 sm:px-8">
          <ProjectList items={items} />
        </div>
      )}
    </main>
  );
}

function ProjectList({ items }: { items: ProjectItem[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-[20px] border border-dashed border-line-strong p-12 text-center text-muted-foreground">
        아직 프로젝트가 없어요.{" "}
        <Link href="/" className="font-medium text-foreground underline underline-offset-4">
          아이디어 한 줄
        </Link>
        로 시작해 보세요.
      </div>
    );
  }
  return (
    <ul className="mt-10 border-t">
      {items.map((p, i) => (
        <li key={p.id} className="flex items-center gap-1 border-b transition-colors hover:bg-muted/50 sm:pr-2">
          <Link
            href={p.href}
            className="group grid min-w-0 flex-1 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 py-5 sm:grid-cols-[48px_minmax(0,1fr)_auto_auto] sm:px-2"
          >
            <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <p className="truncate font-display text-[22px] font-light tracking-[-0.02em]">{p.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{p.date}</p>
            </div>
            <span
              className={
                "rounded-full border px-2.5 py-1 text-xs " +
                (p.status === "done" ? "border-foreground bg-foreground text-background" : "border-line-strong text-ink-2")
              }
            >
              {PROJECT_STATUS_LABELS[p.status]}
            </span>
            <span className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors group-hover:text-foreground sm:inline-flex">
              {p.status === "done" ? "결과 보기" : "이어하기"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
          <ProjectMenu projectId={p.id} title={p.title} unlocked={p.unlocked} />
        </li>
      ))}
    </ul>
  );
}

// 픽셀 고리 행성 아이콘
function PixelPlanetIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="size-3.5" fill="currentColor" shapeRendering="crispEdges">
      <rect x="4" y="2" width="4" height="1" />
      <rect x="3" y="3" width="6" height="2" />
      <rect x="0" y="5" width="12" height="1" />
      <rect x="3" y="6" width="6" height="1" />
      <rect x="1" y="7" width="10" height="1" />
      <rect x="4" y="8" width="4" height="1" />
      <rect x="10" y="4" width="1" height="1" />
      <rect x="1" y="6" width="1" height="1" />
    </svg>
  );
}
