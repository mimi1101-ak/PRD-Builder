import { cn } from "@/lib/utils";

// MOMO: 대화 상대역인 검은 픽셀 고양이 (앉아 있는 모습). # 몸, o 흰 눈, . 빈칸 — 24 × 23 칸
const ROWS = [
  "....##..................",
  "....###.................",
  "....####................",
  "....#####.......##......",
  "....######....####......",
  "....##############......",
  "....###############.....",
  "....###############.....",
  "....######o###o####.....",
  "....######o###o####.....",
  ".....##############.....",
  ".....#############......",
  "......###########.......",
  ".....#############..#...",
  "....###############.##..",
  "...################.###.",
  "...#################.##.",
  "...#################.##.",
  "...#################.##.",
  "...################.##..",
  "....##################..",
  ".....######.#########...",
  "......#####.#####.......",
];

const WIDTH = ROWS[0].length;
const HEIGHT = ROWS.length;

// 같은 줄에서 이어진 칸은 사각형 하나로 묶는다
function spans(char: string) {
  const out: { x: number; y: number; w: number }[] = [];
  ROWS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== char) continue;
      let end = x;
      while (row[end + 1] === char) end++;
      out.push({ x, y, w: end - x + 1 });
      x = end;
    }
  });
  return out;
}

const BODY = spans("#");
const EYES = spans("o");

export function Momo({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("text-foreground", className)}
    >
      <g fill="currentColor">
        {BODY.map((s) => (
          <rect key={`b${s.x}-${s.y}`} x={s.x} y={s.y} width={s.w} height={1} />
        ))}
      </g>
      <g fill="var(--background)">
        {EYES.map((s) => (
          <rect key={`e${s.x}-${s.y}`} x={s.x} y={s.y} width={s.w} height={1} />
        ))}
      </g>
    </svg>
  );
}
