"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectMenu } from "@/components/projects/project-menu";
import { StarSky } from "@/components/projects/star-sky";
import { subscribeTicker, useReducedMotion, useViewport, type Viewport } from "@/components/projects/universe-hooks";
import { PLANET_GRID, drawDust, drawPlanet, planetName, planetSpec, rng } from "@/lib/planet-art";
import { PROJECT_STATUS_LABELS } from "@/lib/domain";
import type { ProjectItem } from "@/components/projects/projects-view";
import { cn } from "@/lib/utils";

const PER_PAGE = 10; // 가로 5 × 세로 2 (휴대폰은 가로 2 × 세로 5)
const SMALL = 720;

// 한 칸 크기(CSS px): 화면 높이(두 줄이 들어가게)와 칸 너비 중 작은 쪽에 맞춘다
function cellSize(vp: Viewport | null) {
  if (!vp) return 2.5;
  if (vp.w < SMALL) return 2;
  const byHeight = vp.h >= 860 ? 3 : 2.5;
  const content = Math.min(vp.w, 1320 + 48) - 2 * 72 - 4 * 16;
  const byWidth = Math.floor(((content / 5 + 24) / PLANET_GRID) * 2) / 2;
  return Math.max(1.5, Math.min(byHeight, byWidth));
}

export function ProjectUniverse({ items }: { items: ProjectItem[] }) {
  const vp = useViewport();
  const small = !!vp && vp.w < SMALL;
  const dpr = vp?.dpr ?? 1;
  const p = Math.max(1, Math.round(cellSize(vp) * dpr)); // 한 칸의 실제 화면 픽셀 수 (정수 → 선명)
  const size = (PLANET_GRID * p) / dpr;

  const pages = useMemo(() => {
    const out: ProjectItem[][] = [];
    for (let i = 0; i < items.length; i += PER_PAGE) out.push(items.slice(i, i + PER_PAGE));
    return out.length ? out : [[]];
  }, [items]);
  const [page, setPage] = useState(0);
  const current = Math.min(page, pages.length - 1); // 삭제로 페이지가 줄어도 범위 안에

  const trackRef = useRef<HTMLDivElement>(null);
  const pagerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null);

  const go = useCallback((next: number) => setPage(Math.max(0, Math.min(pages.length - 1, next))), [pages.length]);
  const goRef = useRef(go);
  const currentRef = useRef(current);
  useEffect(() => {
    goRef.current = go;
    currentRef.current = current;
  });

  // 트랙패드 좌우 스와이프, 키보드 ← →
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    let acc = 0, lockUntil = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (performance.now() < lockUntil) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 60) {
        goRef.current(currentRef.current + Math.sign(acc));
        acc = 0;
        lockUntil = performance.now() + 700;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable], [role=dialog], [role=menu]")) return;
      goRef.current(currentRef.current + (e.key === "ArrowRight" ? 1 : -1));
    };
    pager.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("keydown", onKey);
    return () => {
      pager.removeEventListener("wheel", onWheel);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // 끌어서·밀어서 넘기기. 옆으로 8px 넘게 움직여야 끌기로 보고, 그 전에는 평소처럼 누르기
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // 버튼(⋮·화살표)과 팝업(메뉴·확인 창은 화면 다른 곳에 그려짐)에서는 끌기 시작 안 함
    const target = e.target as Element;
    if (e.button !== 0 || !e.currentTarget.contains(target) || target.closest("button")) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const track = trackRef.current;
    if (!d || d.id !== e.pointerId || !track) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) <= 8) return;
      d.moved = true;
      // 붙잡은 뒤에는 손을 떼도 링크가 눌리지 않는다
      e.currentTarget.setPointerCapture(e.pointerId);
      track.dataset.dragging = "";
    }
    const edge = (current === 0 && dx > 0) || (current === pages.length - 1 && dx < 0);
    track.style.transform = `translateX(calc(${-current * 100}% + ${edge ? dx * 0.25 : dx}px))`;
  }
  function onPointerEnd(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    const track = trackRef.current;
    if (!d?.moved || !track) return;
    delete track.dataset.dragging;
    const dx = e.clientX - d.x;
    const next = Math.max(0, Math.min(pages.length - 1, dx < -60 ? current + 1 : dx > 60 ? current - 1 : current));
    track.style.transform = `translateX(${-next * 100}%)`;
    go(next);
  }

  const multi = pages.length > 1;

  return (
    <>
      <StarSky offset={current * (small ? 36 : 80)} />
      <div
        ref={pagerRef}
        className="universe-pager relative z-[1] mt-7"
        style={{ "--rowh": `${Math.round(size + (small ? 56 : 66))}px` } as CSSProperties}
        aria-roledescription="carousel"
        aria-label="프로젝트 우주"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div ref={trackRef} className="universe-track" style={{ transform: `translateX(${-current * 100}%)` }}>
          {pages.map((list, pi) => (
            <div
              key={pi}
              className="universe-page"
              role="group"
              aria-roledescription="slide"
              aria-label={`${pi + 1} / ${pages.length} 페이지`}
              inert={pi !== current}
            >
              {list.map((item, i) => (
                <PlanetCard key={item.id} item={item} index={i} p={p} size={size} />
              ))}
              {/* 마지막 페이지에 빈칸이 있으면: 새 행성이 태어날 자리 */}
              {pi === pages.length - 1 && list.length < PER_PAGE && <DustCard index={list.length} p={p} size={size} />}
            </div>
          ))}
        </div>
        {multi &&
          (["prev", "next"] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              data-dir={dir}
              aria-label={dir === "prev" ? "이전 페이지" : "다음 페이지"}
              disabled={dir === "prev" ? current === 0 : current === pages.length - 1}
              onClick={() => go(current + (dir === "prev" ? -1 : 1))}
              className="universe-side grid size-11 place-items-center rounded-full border bg-white/5 text-ink-2 transition-[background-color,color,opacity] hover:bg-white/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
            >
              {dir === "prev" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
            </button>
          ))}
      </div>

      {items.length === 0 && (
        <p className="relative z-[1] text-center text-sm text-muted-foreground">
          아직 우주가 비어 있어요. 아이디어 한 줄로 첫 행성을 만들어 보세요.
        </p>
      )}

      {multi && (
        <nav className="relative z-[1] mt-2.5 flex items-center justify-center gap-2.5" aria-label="우주 페이지">
          <Button variant="ghost" size="icon-sm" aria-label="이전 페이지" disabled={current === 0} onClick={() => go(current - 1)}>
            <ChevronLeft />
          </Button>
          <div className="flex">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}페이지`}
                aria-current={i === current}
                onClick={() => go(i)}
                className="group/dot grid size-5 place-items-center"
              >
                <span className="size-[7px] border border-muted-foreground transition-colors group-aria-[current=true]/dot:border-foreground group-aria-[current=true]/dot:bg-foreground" />
              </button>
            ))}
          </div>
          <span className="min-w-16 text-center mono-label text-muted-foreground">
            {String(current + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="다음 페이지"
            disabled={current === pages.length - 1}
            onClick={() => go(current + 1)}
          >
            <ChevronRight />
          </Button>
        </nav>
      )}
    </>
  );
}

// 칸 안에서 조금 어긋난 자리 + 행성마다 다른 둥둥 속도·방향
function floatStyle(seed: number, index: number): CSSProperties {
  const r = rng(seed);
  return {
    "--dx": `${Math.round((r() - 0.5) * 40)}px`,
    "--dy": `${Math.round((r() - 0.5) * 40)}px`,
    "--fx": `${Math.round((r() - 0.5) * 12)}px`,
    "--fy": `${Math.round(5 + r() * 6) * (r() < 0.5 ? -1 : 1)}px`,
    "--fd": `${(6 + r() * 6).toFixed(1)}s`,
    "--fdel": `${(-r() * 12).toFixed(1)}s`,
    "--delay": `${(index * 0.04).toFixed(2)}s`,
  } as CSSProperties;
}

function PlanetCard({ item, index, p, size }: { item: ProjectItem; index: number; p: number; size: number }) {
  const spec = useMemo(() => planetSpec(item.id), [item.id]);
  const name = useMemo(() => planetName(item.id), [item.id]);
  const forming = item.status !== "done"; // 아직 기획 중이면 점들이 모이는 중
  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, px: number, t: number) => drawPlanet(ctx, px, spec, t, forming),
    [spec, forming],
  );
  const status = PROJECT_STATUS_LABELS[item.status];

  return (
    <div className="universe-planet group/planet" style={floatStyle(spec.seed ^ 0x5eed, index)}>
      <Link
        href={item.href}
        draggable={false}
        aria-label={`${name} — ${item.title}, ${status}`}
        className="flex flex-col items-center rounded-2xl px-1 pt-0.5 pb-1.5 text-center"
      >
        <PixelCanvas
          p={p}
          size={size}
          paint={paint}
          animated={!!spec.anim}
          className="transition-[transform,filter] duration-500 group-hover/planet:-translate-y-1 group-hover/planet:scale-105 group-hover/planet:drop-shadow-[0_0_16px_rgba(255,255,255,0.14)]"
        />
        <span className="mt-1 font-display text-xl font-light whitespace-nowrap tracking-[-0.02em] max-[719px]:text-[17px]">
          {name}
        </span>
        <span className="mt-0.5 max-w-[calc(100%-40px)] truncate text-[13px] text-ink-2 max-[719px]:max-w-[calc(100%-16px)] max-[719px]:text-xs">
          {item.title}
        </span>
        <span
          className={cn(
            "mt-1 inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap text-muted-foreground",
            item.status === "done" && "text-ink-2",
          )}
        >
          <i
            className={cn(
              "size-1.5 shrink-0 border border-current",
              item.status === "done" && "bg-current",
              item.status === "final_check" && "bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]",
            )}
          />
          {forming && "모이는 중 · "}
          {status}
        </span>
      </Link>
      <ProjectMenu
        projectId={item.id}
        title={item.title}
        unlocked={item.unlocked}
        className="absolute top-0 right-1 [@media(hover:hover)]:opacity-0 group-focus-within/planet:opacity-100 group-hover/planet:opacity-100 aria-expanded:opacity-100"
      />
    </div>
  );
}

function DustCard({ index, p, size }: { index: number; p: number; size: number }) {
  return (
    <div className="universe-planet group/planet" style={floatStyle(4242, index)}>
      <Link
        href="/"
        draggable={false}
        className="flex flex-col items-center rounded-2xl px-1 pt-0.5 pb-1.5 text-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <PixelCanvas p={p} size={size} paint={drawDust} />
        <span className="mt-1 text-[15px] font-medium">+ 새 아이디어</span>
        <span className="mt-0.5 text-xs">흩어진 생각 모으기</span>
      </Link>
    </div>
  );
}

// 64 × 64 칸 그림을 화면 픽셀에 딱 맞춰 그린다. 움직이는 행성은 화면에 보일 때만 다시 그린다.
function PixelCanvas({
  p,
  size,
  paint,
  animated = false,
  className,
}: {
  p: number;
  size: number;
  paint: (ctx: CanvasRenderingContext2D, p: number, t: number) => void;
  animated?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    cv.width = cv.height = PLANET_GRID * p;
    paint(ctx, p, performance.now() / 1000);
    if (!animated || reduce) return;
    let visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
    });
    io.observe(cv);
    const off = subscribeTicker((t) => {
      if (visible) paint(ctx, p, t);
    });
    return () => {
      off();
      io.disconnect();
    };
  }, [p, paint, animated, reduce]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none block", className)} style={{ width: size, height: size }} />;
}
