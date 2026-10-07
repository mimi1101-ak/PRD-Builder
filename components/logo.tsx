import { cn } from "@/lib/utils";

// 하프톤 점 9개: 왼쪽 위가 가장 크고 오른쪽 아래로 갈수록 작아진다 (배경 블랙홀과 같은 픽셀 언어)
const DOTS: [number, number, number][] = [
  [3, 3, 5.6], [10, 3, 4.4], [17, 3, 3],
  [3, 10, 4.4], [10, 10, 3], [17, 10, 1.8],
  [3, 17, 3], [10, 17, 1.8], [17, 17, 1],
];

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn("text-foreground", className)} fill="currentColor">
      {DOTS.map(([cx, cy, s]) => (
        <rect key={`${cx}-${cy}`} x={cx - s / 2} y={cy - s / 2} width={s} height={s} />
      ))}
    </svg>
  );
}
