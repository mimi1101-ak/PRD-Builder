"use client";

import { useSyncExternalStore } from "react";

// 화면 크기 (서버에서는 알 수 없으니 null)
export type Viewport = { w: number; h: number; dpr: number };

let viewportCache: Viewport | null = null;
function readViewport(): Viewport {
  const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1;
  if (!viewportCache || viewportCache.w !== w || viewportCache.h !== h || viewportCache.dpr !== dpr) {
    viewportCache = { w, h, dpr };
  }
  return viewportCache;
}
function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
export function useViewport(): Viewport | null {
  return useSyncExternalStore(subscribeResize, readViewport, () => null);
}

// 움직임 줄이기 설정
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE_QUERY).matches, () => false);
}

// 움직이는 행성(은하·블랙홀·별)을 함께 다시 그리는 시계: 초당 약 11번
const subscribers = new Set<(t: number) => void>();
let raf = 0;
let last = 0;
function tick(ts: number) {
  raf = requestAnimationFrame(tick);
  if (ts - last < 90) return;
  last = ts;
  const t = ts / 1000;
  subscribers.forEach((fn) => fn(t));
}
export function subscribeTicker(fn: (t: number) => void) {
  subscribers.add(fn);
  if (!raf) raf = requestAnimationFrame(tick);
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
