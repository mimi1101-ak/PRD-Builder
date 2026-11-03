"use client";

import { ArrowRight } from "lucide-react";
import { PICK_IDEA_EVENT } from "@/components/home/idea-composer";

// 홈 "아이디어 예시". 넓은 화면에서는 카드 여섯 장을 부채꼴로 펼치고, 커서를 올린 카드가 똑바로 서며 핵심 기능을 보여 준다.
// 좁은 화면에서는 옆으로 넘겨 보는 줄로 바뀐다. "이 아이디어로 시작하기"는 첫 화면 입력창에 문장을 채우고 그리로 올려 준다(바로 보내지는 않음).
const IDEAS: { kind: string; idea: string; data: string[]; features: string[] }[] = [
  {
    kind: "예약 앱",
    idea: "동네 필라테스 예약 앱을 만들고 싶어요. 회원은 수업을 예약하고, 강사님은 시간표를 관리해요.",
    data: ["회원", "수업", "예약", "결제"],
    features: ["수업 시간표 보기", "예약 · 취소", "수업 전날 알림"],
  },
  {
    kind: "쇼핑몰",
    idea: "직접 만든 도자기를 파는 작은 쇼핑몰이 필요해요. 주문이 들어오면 바로 알고 싶어요.",
    data: ["상품", "주문", "배송", "리뷰"],
    features: ["상품 목록 · 상세", "장바구니 · 결제", "새 주문 알림"],
  },
  {
    kind: "커뮤니티",
    idea: "러닝 크루 커뮤니티를 만들고 싶어요. 달린 기록을 올리고, 모임 일정도 같이 봐요.",
    data: ["회원", "기록", "댓글", "모임"],
    features: ["러닝 기록 올리기", "댓글 · 좋아요", "모임 참여 신청"],
  },
  {
    kind: "업무 관리",
    idea: "작은 식당 재고를 관리하고 싶어요. 재료가 떨어지기 전에 알려 주면 좋겠어요.",
    data: ["재료", "입고", "사용 기록", "직원"],
    features: ["재고 현황판", "입고 · 사용 기록", "부족 재료 알림"],
  },
  {
    kind: "AI 서비스",
    idea: "식단 사진을 올리면 AI가 기록해 주는 앱이요. 한 달 무료로 쓰고 구독하게 하고 싶어요.",
    data: ["회원", "식단 기록", "사진", "구독"],
    features: ["사진으로 식단 기록", "AI 영양 요약", "월 구독 결제"],
  },
  {
    kind: "교육",
    idea: "학원 숙제를 내고 확인하는 서비스가 필요해요. 학부모님도 볼 수 있으면 좋겠어요.",
    data: ["학생", "반", "숙제", "제출"],
    features: ["숙제 내기 · 제출", "채점 · 한 줄 피드백", "학부모 알림"],
  },
];

function pick(idea: string) {
  window.dispatchEvent(new CustomEvent(PICK_IDEA_EVENT, { detail: idea }));
}

export function IdeaExamples() {
  const mid = (IDEAS.length - 1) / 2;

  return (
    <section className="relative z-10 mt-20 pb-16 md:mt-32 md:pb-24">
      <div className="text-center">
        <p className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
          <span className="mono-label rounded-full border border-line-strong px-2 py-0.5 text-foreground">Ideas</span>
          &ldquo;제 아이디어도 만들 수 있을까요?&rdquo;
        </p>
        <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,36px)] font-light leading-[1.3] tracking-[-0.03em]">
          아이디어는 달라도,
          <br />
          기획은 빈틈없이
        </h2>
        <p className="mt-3 break-keep text-[14.5px] leading-[1.75] text-muted-foreground">
          예약, 쇼핑몰, 커뮤니티, AI 서비스까지.
          <br />
          어떤 아이디어든 MOMO가 질문으로 빈 곳을 채워 줘요.
        </p>
      </div>

      <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 pt-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:relative lg:mx-0 lg:mt-14 lg:block lg:h-[400px] lg:overflow-visible lg:p-0">
        {IDEAS.map((item, i) => {
          const offset = i - mid;
          return (
            <li
              key={item.kind}
              style={
                {
                  "--x": `calc(${offset} * min(13vw, 150px))`,
                  "--r": `${offset * 5}deg`,
                  "--y": `${offset * offset * 9}px`,
                } as React.CSSProperties
              }
              className="group w-[250px] shrink-0 snap-center lg:absolute lg:left-1/2 lg:top-6 lg:ml-[-125px] lg:origin-bottom lg:[transform:translateX(var(--x))_translateY(var(--y))_rotate(var(--r))] lg:transition-transform lg:duration-500 lg:ease-[cubic-bezier(0.2,0.7,0.1,1)] lg:hover:z-20 lg:hover:[transform:translateX(var(--x))_translateY(-28px)_rotate(0deg)_scale(1.06)] lg:focus-within:z-20 lg:focus-within:[transform:translateX(var(--x))_translateY(-28px)_rotate(0deg)_scale(1.06)]"
            >
              <div className="flex h-[330px] flex-col rounded-2xl border bg-background p-5 shadow-[0_14px_36px_-22px_rgba(0,0,0,0.3)] transition-shadow duration-500 group-hover:shadow-[0_28px_60px_-28px_rgba(0,0,0,0.4)]">
                <div className="flex items-baseline justify-between">
                  <p className="text-[17px] font-semibold tracking-tight">{item.kind}</p>
                  <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
                </div>
                <p className="mt-3 break-keep border-l-2 border-line-strong pl-3 text-[12.5px] leading-[1.7] text-ink-2">
                  &ldquo;{item.idea}&rdquo;
                </p>

                <div className="mt-auto">
                  <div className="lg:group-focus-within:hidden lg:group-hover:hidden">
                    <p className="text-[11px] text-muted-foreground">저장할 데이터</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.data.map((d) => (
                        <span key={d} className="rounded-md border px-2 py-0.5 text-[11px] text-ink-2">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden lg:group-focus-within:block lg:group-hover:block">
                    <p className="text-[11px] text-muted-foreground">핵심 기능</p>
                    <ul className="mt-2 space-y-1.5">
                      {item.features.map((f, n) => (
                        <li key={f} className="flex items-center gap-2 text-[12px]">
                          <span className="font-mono text-[10.5px] text-muted-foreground">F{n + 1}</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => pick(item.idea)}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-muted text-[12.5px] font-medium transition-colors group-hover:bg-foreground group-hover:text-background focus-visible:bg-foreground focus-visible:text-background focus-visible:outline-none"
                  >
                    이 아이디어로 시작하기 <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 text-center lg:mt-6">
        <button
          type="button"
          onClick={() => pick("")}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-7 text-[14px] font-medium text-background transition-transform duration-200 hover:-translate-y-0.5"
        >
          내 아이디어로 시작하기 <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
