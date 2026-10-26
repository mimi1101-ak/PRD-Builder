import Image from "next/image";

// 홈 아래 "결과 미리보기". 실제로 만든 문서 화면을 옆으로 흘려 보여 준다(커서를 올리면 멈춤).
// 이미지는 public/previews/ 에 넣고 이 배열만 고친다. 1220×830 비율로 잘라 두었다.
const PREVIEWS: { src: string; label: string; desc: string }[] = [
  { src: "/previews/prd.webp", label: "PRD.md", desc: "무엇을 왜 만드는지 정리한 기획서" },
  { src: "/previews/tasks.webp", label: "TASKS.md", desc: "AI에게 그대로 붙여 넣는 단계별 작업 프롬프트" },
  { src: "/previews/claude.webp", label: "CLAUDE.md", desc: "AI 코딩 도구가 먼저 읽는 프로젝트 안내서" },
];

export function ResultPreviews() {
  // 끊김 없이 돌도록 같은 줄을 두 번 이어 붙인다. 두 번째 줄은 화면 읽기 도구에서 숨긴다.
  const loop = [...PREVIEWS, ...PREVIEWS];

  return (
    <section className="relative z-10 mt-16 md:mt-24">
      <p className="mono-label text-muted-foreground">Preview</p>
      <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,36px)] font-light tracking-[-0.03em]">결과 미리보기</h2>
      <p className="mt-2 text-sm text-muted-foreground">실제로 만든 기획서 예시예요. 커서를 올리면 멈춰요.</p>
      <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        {/* 칸 사이 간격은 gap 대신 pr 로 줘야 절반 지점이 정확히 맞아 이음새가 튀지 않는다 */}
        <ul className="marquee flex w-max">
          {loop.map((p, i) => (
            <li key={i} aria-hidden={i >= PREVIEWS.length || undefined} className="w-[min(78vw,520px)] shrink-0 box-content pr-4">
              <div className="relative aspect-[1220/830] overflow-hidden rounded-[20px] border bg-background">
                <Image
                  src={p.src}
                  alt={`${p.label} 결과 화면 예시`}
                  fill
                  sizes="(min-width: 768px) 520px, 78vw"
                  className="object-cover object-top"
                />
              </div>
              <p className="mt-2.5 text-sm">
                <span className="mono-label text-muted-foreground">{p.label}</span>
                <span className="ml-2 text-muted-foreground">{p.desc}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
