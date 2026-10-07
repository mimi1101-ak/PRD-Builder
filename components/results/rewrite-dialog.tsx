"use client";

import { useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import { DOC_LABELS, rewritesLeftLabel, type DocKind } from "@/lib/domain";
import { readJsonError, readNdjson } from "@/lib/ndjson";
import type { RewriteTarget } from "@/components/results/doc-body";

type RewriteEvent =
  | { type: "text"; delta: string }
  | {
      type: "done";
      document: { kind: DocKind; content: string; rewriteCount: number };
      rewritesLeft: number;
    }
  | { type: "error"; message: string; retryable: boolean };

export function RewriteDialog({
  projectId,
  kind,
  target,
  rewritesLeft,
  onClose,
  onDone,
}: {
  projectId: string;
  kind: DocKind;
  target: RewriteTarget | null;
  rewritesLeft: number;
  onClose: () => void;
  onDone: (content: string, rewriteCount: number, rewritesLeft: number) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 열 때마다 새 상태로 시작하도록 부모가 key 를 바꿔 다시 그린다.

  async function run() {
    if (!target || running) return;
    setRunning(true);
    setError(null);
    setPreview("");
    let finished = false;
    try {
      const res = await fetch("/api/documents/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kind, heading: target.heading, instruction }),
      });
      if (!res.ok) {
        setError((await readJsonError(res)).message);
      } else {
        let text = "";
        await readNdjson<RewriteEvent>(res, (ev) => {
          if (ev.type === "text") {
            text += ev.delta;
            setPreview(text);
          } else if (ev.type === "done") {
            finished = true;
            onDone(ev.document.content, ev.document.rewriteCount, ev.rewritesLeft);
          } else if (ev.type === "error") {
            setError(ev.message);
          }
        });
      }
    } catch {
      setError("연결이 끊겼어요. 다시 시도해 주세요.");
    }
    setRunning(false);
    if (finished) {
      toast.success("섹션을 다시 썼어요");
      onClose();
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && !running && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-light tracking-[-0.03em]">섹션 다시 쓰기</DialogTitle>
          <DialogDescription>
            {DOC_LABELS[kind]} · {target?.title} — 다시 쓰기 {rewritesLeftLabel(rewritesLeft)}
          </DialogDescription>
        </DialogHeader>
        {preview ? (
          <div className="max-h-[45dvh] overflow-y-auto rounded-xl border p-5">
            <Markdown>{preview}</Markdown>
          </div>
        ) : (
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            maxLength={500}
            rows={4}
            disabled={running}
            placeholder="어떻게 고칠지 적어 주세요 (비워 두면 더 구체적으로 다듬어요). 예: 관장님 화면을 따로 나눠 주세요"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={running}>
            닫기
          </Button>
          <Button onClick={run} disabled={running || rewritesLeft <= 0}>
            {running ? <Loader2 className="animate-spin" /> : <PenLine />}
            {running ? "다시 쓰는 중…" : "다시 쓰기 (1회 사용)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
