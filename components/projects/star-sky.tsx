"use client";

import { useEffect, useRef } from "react";
import { rng } from "@/lib/planet-art";
import { useReducedMotion } from "@/components/projects/universe-hooks";

const TAU = Math.PI * 2;
const TINTS = ["#ffffff", "#ffffff", "#d5dcff", "#d9cdff", "#b9c6ff"];

/*
 * 우주 보기 배경: 드문드문 작은 점별 + 천천히 나타났다 사라지는 십자 별
 * offset(px) 이 바뀌면 별들이 옆으로 살짝 흘러간다 (페이지를 넘길 때)
 */
export function StarSky({ offset }: { offset: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const target = useRef(offset);
  const reduce = useReducedMotion();

  useEffect(() => {
    target.current = offset;
  }, [offset]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;

    let p = 2, dpr = 1, cols = 0;
    let dots: { x: number; y: number; c: string; a: number; tw: number; ph: number }[] = [];
    let sparks: { x: number; y: number; c: string; len: number; period: number; ph: number }[] = [];
    let current = target.current;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      const W = window.innerWidth, H = window.innerHeight;
      p = Math.max(1, Math.round(2 * dpr));
      cv!.width = Math.ceil((W * dpr) / p) * p;
      cv!.height = Math.ceil((H * dpr) / p) * p;
      cols = cv!.width / p;
      const rows = cv!.height / p;
      const r = rng(7);
      const pick = () => TINTS[Math.floor(r() * TINTS.length)];
      dots = Array.from({ length: Math.floor((W * H) / 6500) }, () => ({
        x: Math.floor(r() * cols), y: Math.floor(r() * rows), c: pick(),
        a: 0.18 + r() * 0.55, tw: r() < 0.35 ? 0.4 + r() * 1.2 : 0, ph: r() * TAU,
      }));
      sparks = Array.from({ length: Math.max(4, Math.floor((W * H) / 70000)) }, () => ({
        x: 3 + Math.floor(r() * (cols - 6)), y: 3 + Math.floor(r() * (rows - 6)), c: pick(),
        len: r() < 0.3 ? 3 : 2, period: 6 + r() * 6, ph: r() * 20,
      }));
    }

    function draw(t: number) {
      const shift = Math.round((current * dpr) / p); // 칸 단위로 흘러가게 (픽셀 그대로)
      const X = (x: number) => ((((x - shift) % cols) + cols) % cols) * p;
      ctx!.clearRect(0, 0, cv!.width, cv!.height);
      for (const d of dots) {
        ctx!.globalAlpha = d.tw && !reduce ? d.a * (0.55 + 0.45 * Math.sin(t * d.tw + d.ph)) : d.a;
        ctx!.fillStyle = d.c;
        ctx!.fillRect(X(d.x), d.y * p, p, p);
      }
      for (const s of sparks) {
        const k = reduce ? 0.7 : Math.max(0, Math.sin(((t + s.ph) / s.period) * Math.PI)) ** 2;
        if (k < 0.04) continue;
        ctx!.fillStyle = s.c;
        ctx!.globalAlpha = k;
        ctx!.fillRect(X(s.x), s.y * p, p, p);
        for (let i = 1; i <= s.len; i++) {
          ctx!.globalAlpha = k * (1 - i / (s.len + 1));
          ctx!.fillRect(X(s.x + i), s.y * p, p, p);
          ctx!.fillRect(X(s.x - i), s.y * p, p, p);
          ctx!.fillRect(X(s.x), (s.y + i) * p, p, p);
          ctx!.fillRect(X(s.x), (s.y - i) * p, p, p);
        }
      }
      ctx!.globalAlpha = 1;
    }

    resize();
    draw(performance.now() / 1000);

    let raf = 0, last = 0;
    function loop(ts: number) {
      raf = requestAnimationFrame(loop);
      const gliding = Math.abs(target.current - current) > 0.5;
      if (gliding) current += (target.current - current) * (reduce ? 1 : 0.07);
      // 흘러가는 동안은 매 프레임, 평소에는 초당 약 11번
      if (!gliding && (reduce || ts - last < 90)) return;
      last = ts;
      draw(ts / 1000);
    }
    raf = requestAnimationFrame(loop);

    let timer = 0;
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        resize();
        draw(performance.now() / 1000);
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [reduce]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-screen w-screen" />;
}
