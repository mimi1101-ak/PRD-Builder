"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { MOMO_SIT_ROWS } from "@/components/momo";

// 개발자 도구 화면 아래를 돌아다니는 MOMO. 걷기 → 앉기(가끔 깜빡) → 가끔 졸기.
// 누르면 한마디, 크레딧을 넣으면(ref.cheer) 깡총 뛰며 축하한다.

// 걷는 모습 (오른쪽을 봄). # 몸, o 흰 눈. 윗부분은 같고 다리만 두 장
const WALK_TOP = [
  "..................#.....#..",
  "#.................##...##..",
  "##...............#########.",
  "##...............#########.",
  ".##..............#########.",
  ".##..............##o###o##.",
  "..##.............##o###o##.",
  "...#######################.",
  "...######################..",
  "..######################...",
  "..#####################....",
  "..#####################....",
  "..#####################....",
  "...###################.....",
  "....#################......",
];
const WALK_A = WALK_TOP.concat([
  "...###..###....###..###....",
  "..###....###..###....###...",
  "..##......##..##......##...",
]);
const WALK_B = WALK_TOP.concat([
  "....###.###.....###.###....",
  "....###.###.....###.###....",
  "....###.###.....###.###....",
]);
// 눈 감은 모습: 위쪽 눈 줄을 몸으로 채워 가는 선만 남긴다
const SIT_EYE_ROW = MOMO_SIT_ROWS.findIndex((r) => r.includes("o"));
const CLOSED = MOMO_SIT_ROWS.map((r, i) => (i === SIT_EYE_ROW ? r.replaceAll("o", "#") : r));

const PX = 3; // 한 칸 = 3px
const SPEED = 0.06; // px/ms (초당 60px)
const LINES = ["냥!", "냐옹", "골골골…", "크레딧 줄 사람 있어요?"];

type Pose = "sit" | "blink" | "sleep" | "walkA" | "walkB";
const POSES: Record<Pose, string[]> = {
  sit: MOMO_SIT_ROWS,
  blink: CLOSED,
  sleep: CLOSED,
  walkA: WALK_A,
  walkB: WALK_B,
};

function Sprite({ rows, flip }: { rows: string[]; flip: boolean }) {
  const w = rows[0].length;
  const h = rows.length;
  const rects = (ch: string) =>
    rows.flatMap((row, y) =>
      [...row].flatMap((c, x) => (c === ch ? [<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />] : [])),
    );
  return (
    <svg
      width={w * PX}
      height={h * PX}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden
      className="block"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <g fill="currentColor">{rects("#")}</g>
      <g fill="var(--background)">{rects("o")}</g>
    </svg>
  );
}

export type MomoWalkerHandle = { cheer: (text: string) => void };

export function MomoWalker({ ref }: { ref?: Ref<MomoWalkerHandle> }) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<Pose>("sit");
  const [facingLeft, setFacingLeft] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 움직임 상태는 매 프레임 바뀌므로 화면 다시 그리기 없이 ref 로 다룬다
  const sim = useRef({ x: 60, target: 60, state: "sit" as "sit" | "sleep" | "walk", until: 0, dir: 1, step: 0 });

  function say(text: string, ms = 1400) {
    setBubble(text);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), ms);
  }

  function hop(twice: boolean) {
    const el = bodyRef.current;
    if (!el) return;
    el.classList.remove("momo-walker-hop", "momo-walker-hop2");
    void el.offsetWidth; // 애니메이션을 처음부터 다시
    el.classList.add(twice ? "momo-walker-hop2" : "momo-walker-hop");
  }

  function sitDown(ms: number) {
    const s = sim.current;
    s.state = "sit";
    s.until = performance.now() + ms;
    setPose("sit");
  }

  useEffect(() => {
    const s = sim.current;
    const root = rootRef.current;
    const maxX = () => Math.max(20, window.innerWidth - 90);
    const place = () => {
      if (root) root.style.transform = `translateX(${Math.round(s.x)}px)`;
    };
    place();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = performance.now();
    s.until = last + 1500;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      if (s.state === "walk") {
        s.x += s.dir * SPEED * dt;
        if (now - s.step > 160) {
          s.step = now;
          setPose((p) => (p === "walkA" ? "walkB" : "walkA"));
        }
        if ((s.dir > 0 && s.x >= s.target) || (s.dir < 0 && s.x <= s.target)) {
          s.x = s.target;
          s.state = Math.random() < 0.25 ? "sleep" : "sit";
          s.until = now + (s.state === "sleep" ? 6000 + Math.random() * 4000 : 2000 + Math.random() * 3500);
          setPose(s.state === "sleep" ? "sleep" : "sit");
        }
      } else if (now > s.until) {
        s.target = 20 + Math.random() * (maxX() - 20);
        s.dir = s.target > s.x ? 1 : -1;
        s.state = "walk";
        setFacingLeft(s.dir < 0);
      } else if (s.state === "sit" && Math.random() < 0.006) {
        setPose("blink");
        setTimeout(() => setPose((p) => (p === "blink" ? "sit" : p)), 160);
      }
      place();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      s.x = Math.min(s.x, maxX());
      s.target = Math.min(s.target, maxX());
      place();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // 크레딧을 넣으면 축하
  useImperativeHandle(ref, () => ({
    cheer(text) {
      sitDown(3000);
      say(text, 2200);
      hop(true);
    },
  }));

  useEffect(() => () => clearTimeout(bubbleTimer.current), []);

  function poke() {
    const s = sim.current;
    if (s.state === "sleep") {
      say("…냥? 깼어요");
      s.until = 0;
    } else {
      say(LINES[Math.floor(Math.random() * LINES.length)]);
    }
    if (s.state !== "walk") sitDown(2500);
    hop(false);
  }

  const sleeping = pose === "sleep";
  const walking = pose === "walkA" || pose === "walkB";

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-2.5 z-30 h-px bg-border" />
      <button
        ref={rootRef}
        type="button"
        onClick={poke}
        aria-label="MOMO 쓰다듬기"
        className="fixed bottom-2.5 left-0 z-30 cursor-pointer text-foreground will-change-transform"
      >
        <div ref={bodyRef} className="relative origin-bottom">
          <span
            aria-live="polite"
            className={`pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-foreground px-2.5 py-1 text-[12.5px] font-semibold text-background transition-opacity duration-200 after:absolute after:left-1/2 after:top-full after:-ml-1 after:border-4 after:border-transparent after:border-t-foreground ${bubble ? "opacity-100" : "opacity-0"}`}
          >
            {bubble}
          </span>
          <Sprite rows={POSES[pose]} flip={walking && facingLeft} />
          {sleeping && (
            <span
              aria-hidden
              className="momo-walker-z pointer-events-none absolute -right-1.5 -top-1.5 font-mono text-xs text-muted-foreground"
            >
              <span>z</span>
              <span>z</span>
              <span>Z</span>
            </span>
          )}
        </div>
      </button>
    </>
  );
}
