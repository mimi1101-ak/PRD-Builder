"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// 홈 아래 "결과 미리보기". 실제로 만든 문서 화면을 옆으로 흘려 보여 준다(커서를 올리면 멈춤, 누르면 크게).
// 이미지는 public/previews/ 에 넣고 이 배열만 고친다. 1220×830 비율로 잘라 두었다.
// 로그인한 화면을 찍을 때는 위쪽 헤더(계정 이름)가 들어가지 않게 자른다.
const PREVIEWS: { src: string; label: string; desc: string }[] = [
  { src: "/previews/prd.webp", label: "PRD.md", desc: "무엇을 왜 만드는지 정리한 기획서" },
  { src: "/previews/tasks.webp", label: "TASKS.md", desc: "AI에게 그대로 붙여 넣는 단계별 작업 프롬프트" },
  { src: "/previews/claude.webp", label: "CLAUDE.md", desc: "AI 코딩 도구가 먼저 읽는 프로젝트 안내서" },
];

export function ResultPreviews() {
  // 끊김 없이 돌도록 같은 줄을 두 번 이어 붙인다. 두 번째 줄은 화면 읽기 도구에서 숨긴다.
  const loop = [...PREVIEWS, ...PREVIEWS];
  const [open, setOpen] = useState<(typeof PREVIEWS)[number] | null>(null);

  return (
    <section className="relative z-10 mt-16 md:mt-24">
      <p className="mono-label text-muted-foreground">Preview</p>
      <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,36px)] font-light tracking-[-0.03em]">결과 미리보기</h2>
      <p className="mt-2 text-sm text-muted-foreground">실제로 만든 기획서 예시예요. 커서를 올리면 멈추고, 누르면 크게 보여요.</p>
      <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        {/* 칸 사이 간격은 gap 대신 pr 로 줘야 절반 지점이 정확히 맞아 이음새가 튀지 않는다 */}
        <ul className="marquee flex w-max">
          {loop.map((p, i) => {
            const copy = i >= PREVIEWS.length;
            return (
              <li key={i} aria-hidden={copy || undefined} className="w-[min(78vw,520px)] shrink-0 box-content pr-4">
                <button
                  type="button"
                  tabIndex={copy ? -1 : undefined}
                  onClick={() => setOpen(p)}
                  aria-label={`${p.label} 결과 화면 크게 보기`}
                  className="relative block aspect-[1220/830] w-full cursor-zoom-in overflow-hidden rounded-[20px] border bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Image
                    src={p.src}
                    alt={`${p.label} 결과 화면 예시`}
                    fill
                    sizes="(min-width: 768px) 520px, 78vw"
                    className="object-cover object-top"
                  />
                </button>
                <p className="mt-2.5 text-sm">
                  <span className="mono-label text-muted-foreground">{p.label}</span>
                  <span className="ml-2 text-muted-foreground">{p.desc}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        {/* 가로·세로 어느 쪽이든 화면 안에 다 들어오게 폭을 잡는다(아래 이름 줄 자리 7rem 을 뺀 높이 기준) */}
        <DialogContent className="w-[min(1220px,calc(100vw-2rem),calc((100dvh-7rem)*1220/830))] max-w-none gap-3 p-3 sm:max-w-none">
          {open && (
            <>
              <div className="relative aspect-[1220/830] w-full overflow-hidden rounded-lg border bg-background">
                <Image
                  src={open.src}
                  alt={`${open.label} 결과 화면 예시`}
                  fill
                  sizes="(min-width: 1284px) 1220px, 100vw"
                  className="object-contain"
                />
              </div>
              <div className="flex items-baseline gap-2 px-1 pb-1">
                <DialogTitle className="mono-label font-normal text-muted-foreground">{open.label}</DialogTitle>
                <DialogDescription>{open.desc}</DialogDescription>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
