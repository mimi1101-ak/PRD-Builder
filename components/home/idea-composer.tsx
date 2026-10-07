"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EXPERIENCES, MAX_INPUT_LENGTH, TOOLS, type ExperienceValue, type ToolValue } from "@/lib/domain";
import { readJsonError } from "@/lib/ndjson";

const EXAMPLES = ["동네 헬스장 출석 체크 앱", "독서 모임 일정·발제 관리 서비스", "1인 카페 단골 스탬프 적립 앱"];

export function IdeaComposer() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [tool, setTool] = useState<ToolValue>("claude_code");
  const [experience, setExperience] = useState<ExperienceValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const canSubmit = idea.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim(), tool, experience }),
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

  const toolLabel = TOOLS.find((t) => t.value === tool)?.label;
  const experienceLabel = EXPERIENCES.find((e) => e.value === experience)?.label;

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
          placeholder="어떤 아이디어를 만들어볼까요? MOMO에게 이야기해주세요"
          className="field-sizing-content block max-h-56 min-h-[92px] w-full resize-none bg-transparent px-[22px] pb-1 pt-5 text-[17px] leading-relaxed outline-none placeholder:text-ink-4"
        />
        <div className="flex items-center justify-between gap-2 py-2.5 pl-3 pr-2.5">
          <div className="flex flex-wrap items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={selector}>
                  <span className="mono-label text-[10px] text-ink-4">도구</span>
                  {toolLabel}
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel>사용할 도구</DropdownMenuLabel>
                {TOOLS.map((t) => (
                  <DropdownMenuItem key={t.value} onSelect={() => setTool(t.value)}>
                    <Check className={t.value === tool ? "opacity-100" : "opacity-0"} />
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={selector}>
                  <span className="mono-label text-[10px] text-ink-4">경험</span>
                  {experienceLabel ?? "선택 안 함"}
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52">
                <DropdownMenuLabel>코딩 경험</DropdownMenuLabel>
                {EXPERIENCES.map((ex) => (
                  <DropdownMenuItem key={ex.value} onSelect={() => setExperience(ex.value)}>
                    <Check className={ex.value === experience ? "opacity-100" : "opacity-0"} />
                    {ex.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
    </div>
  );
}

const selector =
  "inline-flex h-8 items-center gap-2 rounded-full px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-muted data-[state=open]:bg-muted";
