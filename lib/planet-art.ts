/*
 * 내 프로젝트 우주: 프로젝트마다 하나씩 생기는 픽셀 행성
 * - 모양·색·이름은 프로젝트 id 로 정해진다 → 다시 들어와도 같은 행성 (DB 저장 없음)
 * - 64 × 64 칸에 그린 뒤, 화면 픽셀에 딱 맞는 정수 크기로 확대해 선명하게 칠한다
 * - 종류: 동그란 행성(무늬 없음·줄무늬·점무늬·테두리), 고리 행성, 블랙홀, 은하, 별, 초승달, 성단
 * - 아직 기획이 끝나지 않은 프로젝트는 같은 행성을 "모이는 중인 점"으로 흩뜨려 그린다
 */

export const PLANET_GRID = 64;
const G = PLANET_GRID;
const C = G / 2;
const TAU = Math.PI * 2;

type Rand = () => number;
type Vec3 = [number, number, number];
type Palette = [string, string, string, string]; // 어두움 → 밝음
type Buf = (string | null)[];

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 같은 결과를 내는 난수
export function rng(seed: number): Rand {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: Rand) {
  const u = Math.max(r(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r());
}
function pick<T>(r: Rand, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}
function weighted<T>(r: Rand, pairs: [T, number][]): T {
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let x = r() * total;
  for (const [v, w] of pairs) if ((x -= w) < 0) return v;
  return pairs[0][0];
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

const PALETTES: Palette[] = [
  ["#2a2a31", "#6f6f7a", "#c6c6cf", "#ffffff"], // 달빛
  ["#3d0e13", "#a01a23", "#ec3a43", "#fff0f0"], // 빨강
  ["#2b2553", "#6b5fbd", "#a99df2", "#f3f0ff"], // 라벤더
  ["#0e3240", "#2a8098", "#6dcbd8", "#e8fcff"], // 청록
  ["#3f1d0c", "#a5491d", "#f29048", "#ffe9cc"], // 주황
  ["#113427", "#2b8c64", "#72d8a8", "#e6fff3"], // 민트
  ["#3d1431", "#a33e7b", "#f088c0", "#ffe9f5"], // 장미
  ["#152448", "#3462b4", "#88b6f4", "#eef5ff"], // 얼음
  ["#392d1b", "#8f7447", "#dab980", "#fff5de"], // 모래
];
const GALAXY_PALETTES: Palette[] = [
  ["#3a2f70", "#7b6cd2", "#63c2d2", "#ffffff"], // 라벤더·청록
  ["#4a1a2c", "#b2365a", "#f0a060", "#fff6e6"], // 노을
  ["#1e2a52", "#4e72c8", "#b6a4f4", "#ffffff"], // 푸른 보라
  ["#2a2a31", "#7a7a86", "#cfcfd8", "#ffffff"], // 흑백
];
const MOON_PALETTE: Palette = ["#000000", "#5c5c66", "#d8d8de", "#ffffff"];

/* ───────── 행성 이름 ───────── */
const S1 = ["아", "베", "카", "루", "미", "세", "오", "리", "테", "노", "비", "엘", "시", "하", "유", "라", "에", "소", "티", "케", "나", "벨", "로", "마", "제", "키", "파", "실"];
const S2 = ["르", "니", "로", "스", "라", "온", "렌", "미", "나", "타", "시", "벨", "디", "리", "오", "네"];
const S3 = ["아", "온", "스", "라", "엘", "리", "노", "트", "움", "린", "카", "데", "론", "나", "오", "벤"];

export function planetName(id: string) {
  const r = rng(hashStr(id) ^ 0x1234567);
  let n = pick(r, S1) + (r() < 0.7 ? pick(r, S2) : "") + pick(r, S3);
  const s = r();
  if (s < 0.45) n += "-" + String(1 + Math.floor(r() * 98)).padStart(2, "0");
  else if (s < 0.7) n += " " + pick(r, ["b", "c", "d", "e"]);
  else if (s < 0.82) n += " " + pick(r, ["Ⅱ", "Ⅲ", "Ⅳ"]);
  return n;
}

/* ───────── 설계도 ───────── */
type SphereStyle = "solid" | "banded" | "dotted" | "outline";
type Crater = { x: number; y: number; r: number };
type Moon = { a: number; R: number; pal: Palette };
type SphereOpts = {
  freq?: number;
  phase?: number;
  phase2?: number;
  craters?: Crater[];
  edge?: string;
  light?: Vec3;
  cutDark?: number;
};
type Base = { seed: number; pal: Palette; sparks: { x: number; y: number; big: boolean }[]; anim?: boolean };
export type PlanetSpec = Base &
  (
    | ({ kind: "sphere"; R: number; style: SphereStyle; moon: Moon | null } & SphereOpts)
    | ({
        kind: "ringed";
        R: number;
        style: SphereStyle;
        a: number;
        k: number;
        phi: number;
        ring: "line" | "band";
        ringPal: Palette;
        gap: boolean;
        moon: Moon | null;
      } & SphereOpts)
    | { kind: "galaxy"; Rg: number; arms: number; twist: number; k: number; phi: number; spin: number }
    | { kind: "blackhole"; rc: number; k: number; phi: number; twist: number; spin: number }
    | { kind: "star"; L: number; tw: number; ph: number }
    | { kind: "crescent"; R: number; light: Vec3 }
    | { kind: "cluster"; spread: number }
  );

function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}
const LIGHT = norm([-0.55, -0.6, 0.58]);

export function planetSpec(id: string): PlanetSpec {
  const seed = hashStr(id);
  const r = rng(seed);
  const kind = weighted(r, [
    ["sphere", 26],
    ["ringed", 22],
    ["galaxy", 14],
    ["blackhole", 12],
    ["star", 10],
    ["crescent", 9],
    ["cluster", 7],
  ] as [PlanetSpec["kind"], number][]);
  const pal = pick(r, PALETTES);
  const sparks = () =>
    Array.from({ length: r() < 0.45 ? 1 : 0 }, () => ({
      x: 4 + Math.floor(r() * (G - 8)),
      y: 4 + Math.floor(r() * (G - 8)),
      big: r() < 0.5,
    }));

  if (kind === "sphere") {
    const R = 11 + r() * 8;
    const style = weighted<SphereStyle>(r, [["solid", 32], ["banded", 30], ["dotted", 22], ["outline", 16]]);
    const freq = 5 + r() * 8, phase = r() * TAU, phase2 = r() * TAU;
    const craters =
      style === "solid"
        ? Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({ x: (r() - 0.6) * 1.1, y: (r() - 0.6) * 1.1, r: 0.12 + r() * 0.16 }))
        : [];
    const edge = style === "outline" ? pick(r, PALETTES)[2] : undefined;
    const moon = r() < 0.35 ? { a: r() * TAU, R: 2.2 + r() * 1.6, pal: pick(r, PALETTES) } : null;
    return { seed, kind, pal, R, style, freq, phase, phase2, craters, edge, moon, sparks: sparks() };
  }
  if (kind === "ringed") {
    const R = 9.5 + r() * 4;
    const style = weighted<SphereStyle>(r, [["solid", 40], ["banded", 35], ["dotted", 25]]);
    const freq = 5 + r() * 7, phase = r() * TAU, phase2 = r() * TAU;
    const vertical = r() < 0.16;
    const a = R * (vertical ? 1.45 + r() * 0.3 : 1.75 + r() * 0.55);
    const k = vertical ? 0.32 + r() * 0.12 : 0.2 + r() * 0.2;
    const phi = vertical ? (r() < 0.5 ? -1 : 1) * (1.2 + r() * 0.2) : (r() - 0.5) * 0.8;
    const ring = r() < 0.45 ? "line" : "band";
    const ringPal = r() < 0.35 ? pick(r, PALETTES) : pal;
    const gap = r() < 0.5;
    const moon = r() < 0.2 ? { a: r() * TAU, R: 2 + r() * 1.2, pal: pick(r, PALETTES) } : null;
    return { seed, kind, pal, R, style, freq, phase, phase2, craters: [], a, k, phi, ring, ringPal, gap, moon, sparks: sparks() };
  }
  if (kind === "galaxy") {
    const gpal = pick(r, GALAXY_PALETTES);
    const Rg = 21 + r() * 8, arms = r() < 0.75 ? 2 : 3;
    const twist = (r() < 0.5 ? -1 : 1) * (3.2 + r() * 2.4);
    const k = 0.42 + r() * 0.4, phi = r() * Math.PI;
    return { seed, kind, pal: gpal, Rg, arms, twist, k, phi, spin: -Math.sign(twist) * 0.06, anim: true, sparks: sparks() };
  }
  if (kind === "blackhole") {
    const bpal = pick(r, [PALETTES[0], PALETTES[2], PALETTES[4], GALAXY_PALETTES[1]]);
    const rc = 5 + r() * 2.4, k = 0.26 + r() * 0.16, phi = (r() - 0.5) * 0.6;
    return { seed, kind, pal: bpal, rc, k, phi, twist: -2.6, spin: 0.1, anim: true, sparks: sparks() };
  }
  if (kind === "star") {
    const spal = pick(r, [PALETTES[0], PALETTES[3], PALETTES[7], PALETTES[2], PALETTES[4], PALETTES[1]]);
    return { seed, kind, pal: spal, L: 12 + r() * 8, tw: 0.6 + r() * 0.6, ph: r() * TAU, anim: true, sparks: sparks() };
  }
  if (kind === "crescent") {
    const R = 12 + r() * 6;
    const side = r() < 0.5 ? -1 : 1;
    const light = norm([side * 0.95, -0.3 + r() * 0.35, -0.12 - r() * 0.2]);
    return { seed, kind, pal, R, light, sparks: sparks() };
  }
  return { seed, kind: "cluster", pal, spread: 7 + r() * 4, sparks: sparks() };
}

/* ───────── 픽셀 그리기 ───────── */
const newBuf = (): Buf => new Array(G * G).fill(null);
function set(buf: Buf, x: number, y: number, c: string) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= G || y >= G) return;
  buf[y * G + x] = c;
}

function sphere(buf: Buf, cx: number, cy: number, R: number, pal: Palette, style: SphereStyle, o: SphereOpts = {}) {
  const L = o.light ?? LIGHT;
  const r0 = Math.ceil(R);
  for (let y = -r0; y <= r0; y++)
    for (let x = -r0; x <= r0; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d2 = (px * px + py * py) / (R * R);
      if (d2 > 1) continue;
      const gx = Math.floor(cx + x), gy = Math.floor(cy + y);
      const nz = Math.sqrt(1 - d2), nx = px / R, ny = py / R;
      let l = nx * L[0] + ny * L[1] + nz * L[2];
      const b = bayer(gx, gy);
      if (style === "outline" && d2 > ((R - 1.15) / R) ** 2) {
        set(buf, gx, gy, o.edge ?? pal[2]);
        continue;
      }
      if (style === "banded") {
        const s = Math.sin(ny * (o.freq ?? 6) + (o.phase ?? 0) + Math.sin(nx * 2.4 + (o.phase2 ?? 0)) * 0.6);
        if (s > 0.35) l -= 0.24;
        else if (s < -0.8) l += 0.1;
      }
      for (const c of o.craters ?? []) if (Math.hypot(nx - c.x, ny - c.y) < c.r) l -= 0.22;
      l = Math.max(0, l);
      if (style === "dotted" || style === "outline") {
        // 하프톤: 밝은 곳은 촘촘한 점, 어두운 곳은 성긴 점
        const lv = l + (b - 0.5) * 0.2;
        let on = false;
        if (lv > 0.62) on = ((gx + gy) & 1) === 0;
        else if (lv > 0.36) on = (gx & 1) === 0 && (gy & 1) === 0;
        else if (lv > 0.15) on = gx % 3 === 0 && gy % 3 === 0;
        if (on) set(buf, gx, gy, style === "outline" ? "#ffffff" : lv > 0.62 ? pal[3] : pal[2]);
        // 어두운 쪽도 성긴 점으로 남겨 둥근 윤곽이 보이게
        else if (style === "dotted" && lv <= 0.36 && (gx & 1) === 0 && (gy & 1) === 0) set(buf, gx, gy, pal[1]);
        continue;
      }
      const idx = clamp(Math.floor(l * pal.length + (b - 0.5) * 0.95 + 0.25), 0, pal.length - 1);
      if (o.cutDark != null && idx < o.cutDark) continue;
      set(buf, gx, gy, pal[idx]);
    }
}

type Ringed = Extract<PlanetSpec, { kind: "ringed" }>;

// 고리: back = 행성 뒤쪽 절반, front = 앞쪽 절반
function ring(buf: Buf, s: Ringed, part: "back" | "front") {
  const cs = Math.cos(s.phi), sn = Math.sin(s.phi);
  const a = s.a, b = a * s.k;
  const col = s.ringPal;
  if (s.ring === "line") {
    for (let i = 0; i < 900; i++) {
      const t = (i / 900) * TAU;
      const u = a * Math.cos(t), v = b * Math.sin(t);
      if ((part === "back") !== v < 0) continue;
      set(buf, C + u * cs - v * sn, C + u * sn + v * cs, col[2]);
    }
    return;
  }
  const w = Math.max(0.24, 2.2 / b);
  const ext = Math.ceil(a) + 1;
  for (let y = -ext; y <= ext; y++)
    for (let x = -ext; x <= ext; x++) {
      const px = x + 0.5, py = y + 0.5;
      const u = px * cs + py * sn, v = -px * sn + py * cs;
      const e = Math.sqrt((u / a) ** 2 + (v / b) ** 2);
      if (e > 1 || e < 1 - w) continue;
      if ((part === "back") !== v < 0) continue;
      if (s.gap && Math.abs(e - (1 - w * 0.42)) < w * 0.1) continue;
      const gx = Math.floor(C + x), gy = Math.floor(C + y);
      const t = (e - (1 - w)) / w;
      const shade = t + (bayer(gx, gy) - 0.5) * 0.6;
      set(buf, gx, gy, shade > 0.62 ? col[3] : shade > 0.25 ? col[2] : col[1]);
    }
}

function sparkle(buf: Buf, x: number, y: number, c: string, big: boolean) {
  set(buf, x, y, c);
  set(buf, x - 1, y, c);
  set(buf, x + 1, y, c);
  set(buf, x, y - 1, c);
  set(buf, x, y + 1, c);
  if (big) {
    set(buf, x - 2, y, c);
    set(buf, x + 2, y, c);
    set(buf, x, y - 2, c);
    set(buf, x, y + 2, c);
  }
}

function paintDensity(buf: Buf, dens: Float32Array, tsum: Float32Array | null, pal: Palette) {
  for (let i = 0; i < dens.length; i++) {
    const d = dens[i];
    if (d <= 0) continue;
    if (tsum) {
      // 은하: 가운데일수록 밝게
      const tm = tsum[i] / d;
      let lv = tm < 0.12 ? 3 : tm < 0.38 ? 2 : tm < 0.7 ? 1 : 0;
      if (d >= 4) lv = Math.min(3, lv + 1);
      buf[i] = pal[lv];
    } else {
      buf[i] = d >= 2.6 ? pal[3] : d >= 1.3 ? pal[2] : pal[1];
    }
  }
}

function renderBuf(s: PlanetSpec, time: number): Buf {
  const buf = newBuf();
  if (s.kind === "sphere" || s.kind === "ringed") {
    if (s.kind === "ringed") ring(buf, s, "back");
    sphere(buf, C, C, s.R, s.pal, s.style, s);
    if (s.kind === "ringed") ring(buf, s, "front");
    if (s.moon) {
      const dist = (s.kind === "ringed" ? s.a : s.R) + 5 + s.moon.R;
      const mx = clamp(C + Math.cos(s.moon.a) * dist, s.moon.R + 1, G - s.moon.R - 1);
      const my = clamp(C + Math.sin(s.moon.a) * dist * 0.7, s.moon.R + 1, G - s.moon.R - 1);
      sphere(buf, mx, my, s.moon.R, s.moon.pal, "solid");
    }
  } else if (s.kind === "crescent") {
    sphere(buf, C, C, s.R, MOON_PALETTE, "solid", { light: s.light, cutDark: 1 });
  } else if (s.kind === "galaxy") {
    const r = rng(s.seed ^ 0x51);
    const dens = new Float32Array(G * G), tsum = new Float32Array(G * G);
    const cs = Math.cos(s.phi), sn = Math.sin(s.phi);
    const rot = time * s.spin;
    const N = 1500;
    for (let i = 0; i < N; i++) {
      let rad: number, ang: number, t: number;
      if (i < N * 0.16) {
        rad = Math.abs(gauss(r)) * s.Rg * 0.12;
        ang = r() * TAU;
        t = rad / s.Rg;
      } else {
        t = Math.pow(r(), 0.75);
        rad = t * s.Rg;
        ang = ((i % s.arms) * TAU) / s.arms + t * s.twist + gauss(r) * 0.28;
      }
      ang += rot;
      const u = Math.cos(ang) * rad + gauss(r) * 0.9;
      const v = (Math.sin(ang) * rad + gauss(r) * 0.9) * s.k;
      const x = Math.floor(C + u * cs - v * sn), y = Math.floor(C + u * sn + v * cs);
      if (x < 0 || y < 0 || x >= G || y >= G) continue;
      dens[y * G + x] += 1;
      tsum[y * G + x] += t;
    }
    paintDensity(buf, dens, tsum, s.pal);
  } else if (s.kind === "blackhole") {
    const r = rng(s.seed ^ 0x77);
    const back = new Float32Array(G * G), front = new Float32Array(G * G);
    const cs = Math.cos(s.phi), sn = Math.sin(s.phi);
    const rot = time * s.spin;
    for (let i = 0; i < 1000; i++) {
      const t = r();
      const rad = s.rc * 1.45 + t * s.rc * 2.3 + gauss(r) * 0.6;
      const ang = (i & 1) * Math.PI + t * s.twist + gauss(r) * 0.5 + rot;
      const u = Math.cos(ang) * rad, v = Math.sin(ang) * rad * s.k;
      const x = Math.floor(C + u * cs - v * sn), y = Math.floor(C + u * sn + v * cs);
      if (x < 0 || y < 0 || x >= G || y >= G) continue;
      (Math.sin(ang) > 0 ? front : back)[y * G + x] += 1 - t * 0.5;
    }
    paintDensity(buf, back, null, s.pal);
    const rc = s.rc, r0 = Math.ceil(rc + 4);
    for (let y = -r0; y <= r0; y++)
      for (let x = -r0; x <= r0; x++) {
        const d = Math.hypot(x + 0.5, y + 0.5);
        const gx = Math.floor(C + x), gy = Math.floor(C + y);
        const b = bayer(gx, gy);
        if (d <= rc) set(buf, gx, gy, "#000000");
        else if (d <= rc + 1.1 && b < 0.85) set(buf, gx, gy, s.pal[3]); // 빛 고리
        else if (y < -1 && d > rc + 2 && d <= rc + 3.4 && b < 0.4) set(buf, gx, gy, s.pal[1]); // 휘어진 후광
      }
    const top = newBuf();
    paintDensity(top, front, null, s.pal);
    for (let i = 0; i < top.length; i++) if (top[i]) buf[i] = top[i];
  } else if (s.kind === "star") {
    const k = 0.82 + 0.18 * Math.sin(time * s.tw + s.ph);
    const L = s.L * k, g = s.L * 0.42;
    for (let y = -Math.ceil(g); y <= g; y++)
      for (let x = -Math.ceil(g); x <= g; x++) {
        const d = Math.hypot(x, y);
        if (d > 1.5 && d < g && bayer(C + x, C + y) < (1 - d / g) * 0.5) set(buf, C + x, C + y, s.pal[1]);
      }
    for (let i = 1; i <= L; i++) {
      const f = 1 - i / L;
      const c = i < L * 0.4 ? s.pal[3] : s.pal[2];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (i <= 2 || bayer(C + dx * i, C + dy * i + i) < f * 1.2) set(buf, C + dx * i, C + dy * i, c);
      }
      if (i <= L * 0.3) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) set(buf, C + dx * i, C + dy * i, s.pal[2]);
    }
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) set(buf, C + x, C + y, "#ffffff");
    if (s.L > 14) for (const [x, y] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) set(buf, C + x, C + y, "#ffffff");
  } else {
    const r = rng(s.seed ^ 0x99);
    for (let i = 0; i < 90; i++)
      set(buf, C + gauss(r) * s.spread, C + gauss(r) * s.spread * 0.85, r() < 0.25 ? s.pal[3] : r() < 0.6 ? s.pal[2] : s.pal[1]);
    for (let i = 0; i < 3; i++)
      sparkle(buf, Math.floor(C + gauss(r) * s.spread * 0.8), Math.floor(C + gauss(r) * s.spread * 0.6), s.pal[3], i === 0);
  }
  for (const p of s.sparks) {
    if (buf[p.y * G + p.x]) continue;
    if (p.big) sparkle(buf, p.x, p.y, s.pal[2], false);
    else set(buf, p.x, p.y, "#ffffff");
  }
  return buf;
}

// 아직 기획이 끝나지 않은 프로젝트: 점들이 모이는 중
function scatter(buf: Buf, seed: number): Buf {
  const r = rng(seed ^ 0xabc);
  const out = newBuf();
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (!c || r() > 0.5) continue;
    const x = i % G, y = Math.floor(i / G);
    const dx = x - C + 0.5, dy = y - C + 0.5;
    const push = 0.2 + r() * 0.6;
    set(out, x + dx * push + (r() - 0.5) * 4, y + dy * push + (r() - 0.5) * 4, c);
  }
  return out;
}

// 새 행성이 태어날 자리: 아직 모이지 않은 흩어진 점
function dustBuf(): Buf {
  const r = rng(42);
  const buf = newBuf();
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, d = 6 + Math.abs(gauss(r)) * 9;
    set(buf, C + Math.cos(a) * d, C + Math.sin(a) * d * 0.9, r() < 0.3 ? "#9a9aa3" : "#55555d");
  }
  return buf;
}

function paint(ctx: CanvasRenderingContext2D, buf: Buf, p: number) {
  ctx.clearRect(0, 0, G * p, G * p);
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect((i % G) * p, Math.floor(i / G) * p, p, p);
  }
}

// p = 한 칸의 실제 화면 픽셀 수 (정수)
export function drawPlanet(ctx: CanvasRenderingContext2D, p: number, spec: PlanetSpec, time: number, forming: boolean) {
  const buf = renderBuf(spec, time);
  paint(ctx, forming ? scatter(buf, spec.seed) : buf, p);
}

export function drawDust(ctx: CanvasRenderingContext2D, p: number) {
  paint(ctx, dustBuf(), p);
}
