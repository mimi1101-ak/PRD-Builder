"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/*
 * 픽셀 블랙홀 배경 (캔버스)
 * - 가운데: 격자 칸을 빈틈없이 채운 검은 픽셀 원 + 얇은 흰 틈 + 촘촘한 빛 고리
 * - 기울어진 강착 원반: 나선 팔 2개를 따라 느슨하게 흩어진 입자가 약 1분에 한 바퀴 돈다
 * - 핵 위·아래로 휘어 보이는 후광 (중력 렌즈 느낌)
 * - 입자는 격자 칸에 모아 점 크기로 밀도를 표현 (하프톤 픽셀)
 * - 주변 픽셀 별 2~3개가 천천히 나타났다 사라진다
 * - 움직임 줄이기 설정이면 멈춘 한 장면만 그린다. 화면에 안 보이면 멈춘다.
 */

const TAU = Math.PI * 2;
const DISK = 0;
const HALO = 1;
const RING = 2;
const STAR_IN = 1600;
const STAR_HOLD = 2200;
const STAR_OUT = 1600;

const easeInOut = (x: number) => x * x * (3 - 2 * x);

// 같은 결과를 내는 난수 (입자·별 위치 고정)
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

type Options = {
  cell: number;
  cellSmall: number;
  cx: number;
  cy: number;
  coreRatio: number; // 원반 크기 대비 핵 크기
  maxCore?: number; // 넓은 화면에서도 핵 반지름이 이 값(px)을 넘지 않게
  unit: (w: number, h: number) => number; // 원반 크기 단위 (px)
  tilt: number;
  yaw: number;
  spin: number; // 초당 회전 (라디안)
  twist: number; // 나선 팔이 감기는 정도
  particles: number;
  ink: string;
  coreInk: string;
  starInk: string;
  stars: number;
  starRadius?: (w: number, h: number) => number;
  seed: number;
  animate: boolean;
  stillTime: number;
};

const HERO: Options = {
  cell: 5,
  cellSmall: 4,
  cx: 0.5,
  cy: 0.5,
  coreRatio: 0.46,
  maxCore: 24,
  unit: (w, h) => Math.max(16, Math.min(w < 700 ? w * 0.08 : w * 0.044, h * 0.11)),
  tilt: 1.12,
  yaw: -0.32,
  spin: 0.1,
  twist: -2.6,
  particles: 5200,
  ink: "rgba(11,11,11,0.52)",
  coreInk: "rgba(11,11,11,0.95)",
  starInk: "rgba(11,11,11,0.78)",
  stars: 3,
  seed: 11,
  animate: true,
  stillTime: 9,
};

const CORNER: Options = {
  ...HERO,
  animate: false,
  cx: 0.97,
  cy: 0.96,
  yaw: -0.35,
  unit: (w, h) => Math.max(w, h) * 0.05,
  maxCore: undefined, // 구석 배경은 원래 크기 그대로
  ink: "rgba(11,11,11,0.11)",
  coreInk: "rgba(11,11,11,0.16)",
  starInk: "rgba(11,11,11,0.2)",
  stars: 2,
  seed: 3,
  starRadius: (w, h) => Math.max(w, h) * 0.42,
};

type Star = { col: number; row: number; born: number };

class PixelBlackHole {
  private ctx: CanvasRenderingContext2D;
  private o: Options;
  private reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private resizeTimer = 0;
  private raf = 0;
  private visible = true;
  private elapsed = 0;
  private last = 0;

  private W = 0;
  private H = 0;
  private c = 5;
  private cols = 0;
  private rows = 0;
  private cx = 0;
  private cy = 0;
  private unit = 0;
  private rc = 0;
  private coreRatio = 0;
  private n = 0;
  private K = new Uint8Array(0);
  private R = new Float32Array(0);
  private A = new Float32Array(0);
  private Z = new Float32Array(0);
  private Wt = new Float32Array(0);
  private inkGrid = new Float32Array(0);
  private touched = new Int32Array(0);
  private stars: Star[] = [];
  private ready = false;

  constructor(
    private canvas: HTMLCanvasElement,
    options: Options,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.o = options;
    this.resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.layout(), 60);
    });
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.sync();
    });
    this.intersectionObserver.observe(canvas);
    this.reduceQuery.addEventListener("change", this.sync);
    document.addEventListener("visibilitychange", this.sync);
  }

  destroy() {
    window.clearTimeout(this.resizeTimer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.reduceQuery.removeEventListener("change", this.sync);
    document.removeEventListener("visibilitychange", this.sync);
  }

  private still() {
    return this.reduceQuery.matches || !this.o.animate;
  }

  private layout() {
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const o = this.o;
    this.W = W;
    this.H = H;
    this.c = W < 700 ? o.cellSmall : o.cell;
    this.cols = Math.ceil(W / this.c);
    this.rows = Math.ceil(H / this.c);
    // 중심을 격자선에 맞춰 픽셀 원이 좌우·위아래 대칭이 되게 한다
    this.cx = Math.round((o.cx * W) / this.c) * this.c;
    this.cy = Math.round((o.cy * H) / this.c) * this.c;
    this.unit = o.unit(W, H);
    // 원반은 화면에 맞춰 커지지만, 핵(과 빛 고리·후광)은 너무 커지지 않게 비율을 줄인다
    this.coreRatio = o.maxCore ? Math.min(o.coreRatio, o.maxCore / this.unit) : o.coreRatio;
    this.rc = this.unit * this.coreRatio;
    const cells = this.cols * this.rows;
    this.inkGrid = new Float32Array(cells);
    this.touched = new Int32Array(cells);
    this.seedParticles();
    this.seedStars();
    this.elapsed = 0;
    this.last = 0;
    this.ready = true;
    this.draw(performance.now());
    this.canvas.dataset.ready = "true";
    this.sync();
  }

  private seedParticles() {
    const o = this.o;
    const rand = rng(o.seed);
    const n = Math.round(o.particles * Math.min(1, Math.max(0.45, this.W / 1300)));
    const K = new Uint8Array(n);
    const R = new Float32Array(n);
    const A = new Float32Array(n);
    const Z = new Float32Array(n);
    const Wt = new Float32Array(n);
    const rIn = Math.max(1.0, 2.3 * this.coreRatio);
    const rOut = 6.2;
    for (let i = 0; i < n; i++) {
      const p = rand();
      if (p < 0.8) {
        // 원반: 나선 팔을 따라 느슨하게
        const r = rIn + (rOut - rIn) * Math.pow(rand(), 1.12);
        const f = (r - rIn) / (rOut - rIn);
        let a: number;
        if (rand() < 0.58) {
          const arm = rand() < 0.5 ? 0 : Math.PI;
          a = arm + o.twist * Math.log(r / rIn) + gaussian(rand) * (0.28 + 0.7 * f);
        } else {
          a = rand() * TAU;
        }
        K[i] = DISK;
        R[i] = r;
        A[i] = a;
        Z[i] = gaussian(rand) * 0.045 * r;
        Wt[i] = 1;
      } else if (p < 0.91) {
        // 바깥으로 흩어진 먼지
        K[i] = DISK;
        R[i] = rOut * 0.8 + rand() * 4;
        A[i] = rand() * TAU;
        Z[i] = gaussian(rand) * 0.3;
        Wt[i] = 0.85;
      } else if (p < 0.96) {
        // 핵 위·아래로 휘어 보이는 후광
        K[i] = HALO;
        R[i] = (1.34 + Math.abs(gaussian(rand)) * 0.2) * this.coreRatio;
        A[i] = rand() * TAU;
        Wt[i] = 1;
      } else {
        // 촘촘한 빛 고리
        K[i] = RING;
        R[i] = (1.19 + gaussian(rand) * 0.018) * this.coreRatio;
        A[i] = rand() * TAU;
        Wt[i] = 1.4;
      }
    }
    Object.assign(this, { n, K, R, A, Z, Wt });
  }

  // 원반·핵을 피해 별 자리를 고른다 (격자 칸에 맞춤)
  private pickSpot(rand: () => number): { col: number; row: number } {
    const o = this.o;
    const { W, H, c, cx, cy, unit } = this;
    const ex = unit * 7.4;
    const ey = unit * 7.4 * 0.42;
    for (let guard = 0; guard < 200; guard++) {
      const x = c * 3 + rand() * (W - c * 6);
      const y = c * 3 + rand() * (H - c * 6);
      const dx = (x - cx) / ex;
      const dy = (y - cy) / ey;
      if (dx * dx + dy * dy < 1.1) continue; // 원반 위에는 두지 않는다
      if (o.starRadius && Math.hypot(x - cx, y - cy) > o.starRadius(W, H)) continue;
      if (this.stars.some((s) => Math.hypot(s.col * c - x, s.row * c - y) < W * 0.18)) continue; // 서로 떨어뜨린다
      return { col: Math.floor(x / c), row: Math.floor(y / c) };
    }
    return { col: Math.floor((W * 0.15) / c), row: Math.floor((H * 0.2) / c) };
  }

  // 별: 천천히 나타났다가(1.6초) 머물고(2.2초) 천천히 사라진 뒤, 잠시 쉬고 다른 자리에서 다시 나타난다
  private seedStars() {
    const rand = rng(this.o.seed * 7 + 1);
    const now = performance.now();
    this.stars = [];
    for (let i = 0; i < this.o.stars; i++) {
      const spot = this.pickSpot(rand);
      // 처음부터 하나는 보이게, 나머지는 시간차를 두고 나타나게
      this.stars.push({ ...spot, born: now + (i === 0 ? -STAR_IN : i * 2300 + rand() * 900) });
    }
  }

  private starAlpha(s: Star, now: number) {
    const e = now - s.born;
    if (e < 0) return 0;
    if (e < STAR_IN) return easeInOut(e / STAR_IN);
    if (e < STAR_IN + STAR_HOLD) return 1;
    if (e < STAR_IN + STAR_HOLD + STAR_OUT) return 1 - easeInOut((e - STAR_IN - STAR_HOLD) / STAR_OUT);
    s.born = now + 1800 + Math.random() * 3200;
    Object.assign(s, this.pickSpot(Math.random));
    return 0;
  }

  // 별 하나를 격자 픽셀로 그린다: 가운데 + 십자 두 칸
  private star(s: Star) {
    const { ctx, c } = this;
    const px = (dc: number, dr: number, size: number) =>
      ctx.rect((s.col + dc) * c + (c - size) / 2, (s.row + dr) * c + (c - size) / 2, size, size);
    px(0, 0, c * 0.96);
    px(1, 0, c * 0.7);
    px(-1, 0, c * 0.7);
    px(0, 1, c * 0.7);
    px(0, -1, c * 0.7);
    px(2, 0, c * 0.36);
    px(-2, 0, c * 0.36);
    px(0, 2, c * 0.36);
    px(0, -2, c * 0.36);
  }

  private draw(now: number) {
    if (!this.ready) return;
    const { ctx, W, H, c, cols, cx, cy, unit, rc, o, n, K, R, A, Z, Wt, inkGrid, touched } = this;
    const still = this.still();
    // 멈췄다가 다시 돌 때 튀지 않도록 실제로 흐른 시간만 더한다
    if (still) this.last = 0;
    else {
      if (this.last) this.elapsed += Math.min(100, now - this.last);
      this.last = now;
    }
    const rot = (o.stillTime + this.elapsed / 1000) * o.spin;
    const ct = Math.cos(o.tilt);
    const st = Math.sin(o.tilt);
    const cyw = Math.cos(o.yaw);
    const syw = Math.sin(o.yaw);
    const coreSq = rc * rc;
    const gapSq = rc * 1.12 * (rc * 1.12);
    let m = 0;

    for (let i = 0; i < n; i++) {
      const a = A[i] + rot;
      let sx: number;
      let sy: number;
      let w = Wt[i];
      if (K[i] === DISK) {
        const x = R[i] * Math.cos(a);
        const y = R[i] * Math.sin(a);
        const y1 = y * ct - Z[i] * st;
        sx = cx + (x * cyw - y1 * syw) * unit;
        sy = cy + (x * syw + y1 * cyw) * unit;
      } else {
        sx = cx + R[i] * Math.cos(a) * unit;
        sy = cy + R[i] * Math.sin(a) * unit;
        if (K[i] === HALO) {
          const sn = Math.sin(a - o.yaw);
          w *= 0.12 + 1.1 * sn * sn; // 위·아래가 진하게
        }
      }
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const dx = sx - cx;
      const dy = sy - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < coreSq) continue; // 핵 안쪽은 검은 원이 덮는다
      if (d2 < gapSq && K[i] !== RING) continue; // 핵 둘레의 얇은 흰 틈
      const k = ((sy / c) | 0) * cols + ((sx / c) | 0);
      if (inkGrid[k] === 0) touched[m++] = k;
      inkGrid[k] += w;
    }

    ctx.clearRect(0, 0, W, H);

    // 1) 원반·후광·빛 고리
    ctx.beginPath();
    for (let j = 0; j < m; j++) {
      const k = touched[j];
      const d = inkGrid[k];
      const s = c * Math.min(0.86, 0.2 + 0.66 * Math.pow(Math.min(1, d / 3.2), 0.9));
      const col = k % cols;
      const row = (k - col) / cols;
      ctx.rect(col * c + (c - s) / 2, row * c + (c - s) / 2, s, s);
      inkGrid[k] = 0;
    }
    ctx.fillStyle = o.ink;
    ctx.fill();

    // 2) 검은 핵: 격자 칸을 빈틈없이 채운 픽셀 원 (줄마다 한 덩어리로 그려 이음매가 생기지 않게)
    ctx.beginPath();
    const rowTop = Math.floor((cy - rc) / c);
    const rowBottom = Math.floor((cy + rc) / c);
    for (let row = rowTop; row <= rowBottom; row++) {
      const dy = (row + 0.5) * c - cy;
      if (Math.abs(dy) > rc) continue;
      const half = Math.sqrt(rc * rc - dy * dy);
      const colLeft = Math.ceil((cx - half) / c - 0.5);
      const colRight = Math.floor((cx + half) / c - 0.5);
      if (colRight < colLeft) continue;
      ctx.rect(colLeft * c, row * c, (colRight - colLeft + 1) * c, c);
    }
    ctx.fillStyle = o.coreInk;
    ctx.fill();

    // 3) 픽셀 별 (천천히 나타났다 사라짐)
    ctx.fillStyle = o.starInk;
    for (const s of this.stars) {
      const alpha = still ? 0.85 : this.starAlpha(s, now);
      if (alpha < 0.01) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      this.star(s);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 보일 때만, 움직임이 허용될 때만 돈다
  private sync = () => {
    // 뒤에 숨은 탭에서 열리면 크기 감시가 늦게 오므로, 보이게 되는 순간 직접 배치한다
    if (!this.ready) {
      if (!document.hidden) this.layout();
      return;
    }
    const run = !this.still() && this.visible && !document.hidden;
    if (run && !this.raf) {
      const tick = (now: number) => {
        this.raf = requestAnimationFrame(tick);
        this.draw(now);
      };
      this.raf = requestAnimationFrame(tick);
    } else if (!run) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.draw(performance.now());
    }
  };
}

// hero: 첫 화면 가운데에서 도는 블랙홀 / corner: 대화·결과 화면 오른쪽 아래의 옅게 멈춘 블랙홀
export function BlackHole({ variant = "hero", className }: { variant?: "hero" | "corner"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const field = new PixelBlackHole(canvas, variant === "hero" ? HERO : CORNER);
    return () => field.destroy();
  }, [variant]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none opacity-0 transition-opacity duration-[1400ms] data-[ready=true]:opacity-100",
        variant === "corner" && "fixed inset-0 z-0 size-full",
        className,
      )}
    />
  );
}
