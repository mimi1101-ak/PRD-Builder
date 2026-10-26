import Image from "next/image";

// 홈 아래 "결과 미리보기". 이미지를 public/previews/ 에 넣고 src 에 경로(예: "/previews/prd.png")를 적으면 보인다.
// 칸을 늘리거나 줄이려면 이 배열만 고친다. src 가 빈 칸은 개발 서버에서만 자리 표시로 보이고 배포 화면에서는 숨는다.
const PREVIEWS: { src: string; label: string }[] = [
  { src: "", label: "PRD.md" },
  { src: "", label: "TASKS.md" },
  { src: "", label: "CLAUDE.md" },
];

const showPlaceholders = process.env.NODE_ENV !== "production";

export function ResultPreviews() {
  const items = PREVIEWS.filter((p) => p.src || showPlaceholders);
  if (items.length === 0) return null;

  return (
    <section className="relative z-10 mt-16 md:mt-24">
      <p className="mono-label text-muted-foreground">Preview</p>
      <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,36px)] font-light tracking-[-0.03em]">결과 미리보기</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map((p) => (
          <figure key={p.label}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border bg-muted">
              {p.src ? (
                <Image
                  src={p.src}
                  alt={`${p.label} 결과 화면`}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover object-top"
                />
              ) : (
                <div className="flex h-full items-center justify-center border-2 border-dashed border-line-strong text-center text-xs leading-5 text-muted-foreground">
                  이미지 자리
                  <br />
                  public/previews/
                </div>
              )}
            </div>
            <figcaption className="mono-label mt-2.5 text-muted-foreground">{p.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
