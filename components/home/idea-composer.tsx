"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MAX_INPUT_LENGTH } from "@/lib/domain";
import { readJsonError } from "@/lib/ndjson";
import { useTypewriter } from "@/components/home/use-typewriter";

const EXAMPLES = ["동네 헬스장 출석 체크 앱", "독서 모임 일정·발제 관리 서비스", "1인 카페 단골 스탬프 적립 앱"];

// 입력창이 비어 있을 때 안내 문구 자리에 한 글자씩 써졌다 지워지는 문장. 첫 줄(안내)은 고정, 나머지는 섞어서 돈다
const PLACEHOLDERS = [
  "어떤 아이디어를 만들어볼까요? MOMO에게 이야기해주세요",
  "동네 필라테스 수업 예약 앱을 만들고 싶어요",
  "직접 만든 도자기를 파는 작은 쇼핑몰이 필요해요",
  "러닝 크루 기록을 모아 보는 커뮤니티를 만들고 싶어요",
  "식당 재료가 떨어지기 전에 알려 주는 재고 앱이요",
  "식단 사진을 올리면 AI가 기록해 주는 앱이요",
  "학원 숙제를 내고 확인하는 서비스가 필요해요",
];

// 홈 아래쪽 아이디어 카드에서 보내는 신호. detail 문장을 입력창에 채운다(빈 문장이면 입력창으로 옮기기만)
export const PICK_IDEA_EVENT = "dotprd:pick-idea";

export function IdeaComposer() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = useTypewriter(PLACEHOLDERS, { startFull: true, shuffle: true, active: idea === "", hold: 2600 });

  // 예시 칩을 누르면 입력창에 채우고, 바로 Enter 로 보낼 수 있게 입력창으로 커서를 옮긴다
  function pickExample(example: string) {
    setIdea(example);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(example.length, example.length);
    });
  }

  useEffect(() => {
    function onPick(e: Event) {
      const text = (e as CustomEvent<string>).detail;
      const el = inputRef.current;
      if (!el) return;
      if (text) setIdea(text);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      requestAnimationFrame(() => {
        el.focus({ preventScroll: true });
        const end = text ? text.length : el.value.length;
        el.setSelectionRange(end, end);
      });
    }
    window.addEventListener(PICK_IDEA_EVENT, onPick);
    return () => window.removeEventListener(PICK_IDEA_EVENT, onPick);
  }, []);

  const canSubmit = idea.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 도구·경험은 고르지 않는다. 서버가 클로드 코드·선택 안 함으로 채운다
        body: JSON.stringify({ idea: idea.trim() }),
      });
      if (!res.ok) {
        const err = await readJsonError(res);
        toast.error(err.message);
        setSubmitting(false);
        return;
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/p/${id}/chat`);
    } catch {
      toast.error("연결이 불안정해요. 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="rounded-[18px] border border-line-strong bg-background transition-[border-color,box-shadow] duration-200 focus-within:border-foreground focus-within:shadow-[0_0_0_6px_rgba(11,11,11,0.045)]"
      >
        <label htmlFor="idea" className="sr-only">
          아이디어
        </label>
        <textarea
          ref={inputRef}
          id="idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => {
            // 한글 조합 중 Enter 는 무시 (글자가 두 번 보내지는 문제 방지)
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          maxLength={MAX_INPUT_LENGTH}
          rows={2}
          autoFocus
          placeholder={placeholder}
          className="field-sizing-content block max-h-56 min-h-[92px] w-full resize-none bg-transparent px-[22px] pb-1 pt-5 text-[17px] leading-relaxed outline-none placeholder:text-ink-4"
        />
        <div className="flex items-center justify-end gap-2 py-2.5 pl-3 pr-2.5">
          <div className="flex items-center gap-3">
            <span className="mono-label hidden text-[10px] text-ink-4 sm:inline">Enter ↵</span>
            <button
              type="submit"
              disabled={!canSubmit}
              aria-label="아이디어 보내기"
              className="grid size-[42px] shrink-0 place-items-center rounded-full bg-foreground text-background transition-[background-color,transform] duration-200 hover:enabled:-translate-y-0.5 disabled:bg-paper-3 disabled:text-ink-4"
            >
              {submitting ? <Loader2 className="size-[18px] animate-spin" /> : <ArrowUp className="size-[18px]" />}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="mono-label mr-1 text-muted-foreground">예시</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => pickExample(example)}
            className="h-8 rounded-full border border-line-strong bg-background px-3.5 text-[13px] text-ink-2 transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            {example}
          </button>
        ))}
      </div>
      {/* 생성형 AI 서비스라는 사실을 미리 알림 (AI 기본법, 약관 제6조) */}
      <p className="mt-3 text-xs text-muted-foreground">MOMO는 생성형 AI예요. 질문과 문서는 AI가 만들어요.</p>
    </div>
  );
}
