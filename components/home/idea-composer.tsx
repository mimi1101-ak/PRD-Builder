"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
        className="rounded-2xl border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-brand/20"
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
          rows={3}
          autoFocus
          placeholder="만들고 싶은 서비스를 한 줄로 적어 주세요"
          className="field-sizing-content block max-h-64 min-h-24 w-full resize-none bg-transparent px-4 pt-4 text-base outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
          <div className="flex flex-wrap items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                  {toolLabel}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
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
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                  {experienceLabel ?? "코딩 경험"}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
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
          <Button
            type="submit"
            size="icon"
            disabled={!canSubmit}
            aria-label="아이디어 보내기"
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => pickExample(example)}
            className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
