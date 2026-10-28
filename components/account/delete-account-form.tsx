"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DELETE_CONFIRM_WORD } from "@/lib/domain";
import { readJsonError } from "@/lib/ndjson";

// 확인 글자를 입력해야 탈퇴 버튼이 눌린다. 끝나면 인사를 보여 주고 홈으로 (헤더도 로그아웃 상태로 다시 그린다)
export function DeleteAccountForm() {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [pending, setPending] = useState(false);
  const ready = word.trim() === DELETE_CONFIRM_WORD;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: word.trim() }),
      });
      if (!res.ok) {
        toast.error((await readJsonError(res)).message);
        setPending(false);
        return;
      }
      toast.success("탈퇴했어요. 그동안 이용해 주셔서 고마워요.");
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("연결이 불안정해요. 다시 시도해 주세요.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-2">
      <label htmlFor="delete-confirm" className="text-sm text-ink-2">
        탈퇴하려면 아래 칸에 <b className="font-semibold text-foreground">{DELETE_CONFIRM_WORD}</b>를 입력해 주세요.
      </label>
      <Input
        id="delete-confirm"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder={DELETE_CONFIRM_WORD}
        autoComplete="off"
        className="h-11"
      />
      <Button type="submit" variant="destructive" size="lg" className="h-11 w-full" disabled={!ready || pending}>
        {pending && <Loader2 className="animate-spin" />}
        회원 탈퇴하기
      </Button>
    </form>
  );
}
