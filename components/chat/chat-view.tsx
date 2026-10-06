"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, FileText, HelpCircle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMarkdown } from "@/components/markdown";
import { LoginDialog } from "@/components/login-dialog";
import { Logo } from "@/components/logo";
import { AreaList, MobileSummary, SummaryPanel } from "@/components/chat/summary-panel";
import {
  DONT_KNOW_MESSAGE,
  MAX_INPUT_LENGTH,
  countQuestions,
  duplicatesFinalButton,
  stripTrailingList,
  type ChatMessage,
  type ProjectView,
} from "@/lib/domain";
import { readJsonError, readNdjson } from "@/lib/ndjson";
import { cn } from "@/lib/utils";

type ChatEvent =
  | { type: "user_saved"; message: ChatMessage }
  | { type: "text"; delta: string }
  | { type: "done"; message: ChatMessage; project: ProjectView }
  | { type: "error"; message: string; retryable: boolean; code?: string };

type Failure = { message: string; retryable: boolean };

export function ChatView({
  initialProject,
  initialMessages,
  isLoggedIn,
}: {
  initialProject: ProjectView;
  initialMessages: ChatMessage[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [messages, setMessages] = useState(initialMessages);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [input, setInput] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  const busyRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const projectId = project.id;
  const finalCheck = project.status === "final_check";
  const done = project.status === "done";
  const last = messages[messages.length - 1];
  const awaitingReply = last?.role === "user";
  const questionCount = countQuestions(messages);

  // 서버 기준으로 대화를 다시 맞춘다 (실패·중복 처리 후)
  const resync = useCallback(async (): Promise<ChatMessage[] | null> => {
    try {
      const res = await fetch(`/api/chat?projectId=${projectId}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { project: ProjectView; messages: ChatMessage[] };
      setProject(data.project);
      setMessages(data.messages);
      return data.messages;
    } catch {
      return null;
    }
  }, [projectId]);

  // text 가 있으면 새 답을 보내고, 없으면 마지막 내 메시지에 대한 답을 다시 받는다.
  // 실패하면 자동으로 1번 더 시도하고 (PRD 9장), 그래도 실패하면 "다시 시도" 버튼을 보여 준다.
  const send = useCallback(
    async (initialText?: string): Promise<void> => {
      if (busyRef.current) return;
      let text = initialText;

      for (let attempt = 0; attempt < 2; attempt++) {
        busyRef.current = true;
        setBusy(true);
        setFailure(null);
        stickToBottom.current = true;

        const tempId = -Date.now();
        if (text) {
          const content = text;
          setInput("");
          setMessages((m) => [
            ...m,
            { id: tempId, role: "user", content, options: [], phase: finalCheck ? "final_check" : "interview" },
          ]);
        }
        setStreaming("");

        let failed: Failure | null = null;
        let userSaved = !text;
        let needResync = false;

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, message: text }),
          });
          if (!res.ok) {
            const err = await readJsonError(res);
            failed = { message: err.message, retryable: err.code === "pending" };
            if (text) {
              setMessages((m) => m.filter((x) => x.id !== tempId));
              setInput(text);
            }
            if (err.code === "pending" || err.code === "nothing_to_answer" || err.code === "done") needResync = true;
          } else {
            await readNdjson<ChatEvent>(res, (ev) => {
              if (ev.type === "user_saved") {
                userSaved = true;
                setMessages((m) => m.map((x) => (x.id === tempId ? ev.message : x)));
              } else if (ev.type === "text") {
                setStreaming((s) => (s ?? "") + ev.delta);
              } else if (ev.type === "done") {
                setMessages((m) => [...m, ev.message]);
                setProject(ev.project);
              } else if (ev.type === "error") {
                failed = { message: ev.message, retryable: ev.retryable };
                if (ev.code === "stale") needResync = true;
              }
            });
          }
        } catch {
          failed = { message: "연결이 끊겼어요. 다시 시도해 주세요.", retryable: true };
          if (text && !userSaved) needResync = true;
        }

        setStreaming(null);
        busyRef.current = false;
        setBusy(false);

        let canRetry = userSaved;
        if (needResync) {
          const fresh = await resync();
          canRetry = fresh?.[fresh.length - 1]?.role === "user";
          // 내 메시지가 서버에 없으면 입력창에 되돌려 둔다
          if (text && fresh && !fresh.some((m) => m.role === "user" && m.content === text)) setInput(text);
        }

        if (!failed) return;
        const f: Failure = failed;
        if (f.retryable && attempt === 0 && canRetry) {
          text = undefined; // 이미 저장된 내 메시지에 대한 답만 다시 받는다
          continue;
        }
        setFailure(f);
        return;
      }
    },
    [finalCheck, projectId, resync],
  );

  // 처음 들어왔거나 이어하기: 마지막 메시지가 내 메시지면 AI 답을 받아 온다.
  // (개발 모드에서 effect 가 두 번 실행돼도 타이머 정리로 요청은 한 번만 나간다)
  useEffect(() => {
    if (!awaitingReply || done) return;
    const timer = setTimeout(() => void send(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 새 내용이 생기면 아래로 스크롤 (사용자가 위를 보고 있으면 그대로)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, failure, project.status]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function submitInput() {
    const text = input.trim();
    if (!text || busy || awaitingReply || done) return;
    void send(text.slice(0, MAX_INPUT_LENGTH));
  }

  function makePrd() {
    if (isLoggedIn) router.push(`/p/${projectId}`);
    else setLoginOpen(true);
  }

  const lastAi = !awaitingReply && last?.role === "ai" ? last : null;
  const options =
    !busy && !failure && !done && lastAi
      ? lastAi.options.filter((o) => !(finalCheck && duplicatesFinalButton(o)))
      : [];
  const canType = !busy && !awaitingReply && !done;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileSummary
          title={project.title}
          summary={project.summary}
          coverage={project.coverage}
          questionCount={questionCount}
          finalCheck={finalCheck || done}
        />

        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {streaming !== null && (
              <AiBubble>
                {streaming ? (
                  <ChatMarkdown>{stripTrailingList(streaming) + " ▍"}</ChatMarkdown>
                ) : (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> 생각하고 있어요…
                  </span>
                )}
              </AiBubble>
            )}

            {(finalCheck || done) && !busy && lastAi && (
              <FinalCheckCard project={project} done={done} onMakePrd={makePrd} />
            )}

            {failure && (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                <p className="text-destructive">{failure.message}</p>
                {awaitingReply && (
                  <Button size="sm" variant="outline" onClick={() => void send()}>
                    <RotateCcw /> 다시 시도
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t bg-background/95 px-4 pb-4 pt-3">
          <div className="mx-auto w-full max-w-2xl">
            {done ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
                <span className="text-muted-foreground">문서가 이미 만들어졌어요.</span>
                <Button asChild size="sm">
                  <Link href={`/p/${projectId}`}>
                    <FileText /> 결과 보기
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {(options.length > 0 || (lastAi && !finalCheck && !busy && !failure)) && (
                  <div className="mb-2.5 flex flex-wrap gap-2">
                    {options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => void send(option)}
                        className="rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-sm text-foreground transition hover:border-brand/60"
                      >
                        <Sparkles className="mr-1 inline size-3.5 text-brand" />
                        {option}
                      </button>
                    ))}
                    {!finalCheck && lastAi && (
                      <button
                        type="button"
                        onClick={() => void send(DONT_KNOW_MESSAGE)}
                        className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                      >
                        <HelpCircle className="mr-1 inline size-3.5" />잘 모르겠어요 (추천해 주세요)
                      </button>
                    )}
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitInput();
                  }}
                  className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-brand/20"
                >
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submitInput();
                      }
                    }}
                    rows={1}
                    maxLength={MAX_INPUT_LENGTH}
                    disabled={!canType}
                    placeholder={finalCheck ? "더 넣고 싶은 기능이나 고칠 부분을 적어 주세요" : "직접 답을 적어도 돼요"}
                    className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!canType || !input.trim()}
                    aria-label="보내기"
                    className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <SummaryPanel
        title={project.title}
        summary={project.summary}
        coverage={project.coverage}
        questionCount={questionCount}
        finalCheck={finalCheck || done}
      />

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} next={`/p/${projectId}`} />
    </div>
  );
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Logo className="mt-1 size-6 shrink-0" />
      <div className="min-w-0 flex-1 text-[15px]">{children}</div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "ai") {
    return (
      <AiBubble>
        <ChatMarkdown>{stripTrailingList(message.content)}</ChatMarkdown>
      </AiBubble>
    );
  }
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-[15px] leading-7",
          message.id < 0 && "opacity-70",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function FinalCheckCard({ project, done, onMakePrd }: { project: ProjectView; done: boolean; onMakePrd: () => void }) {
  const { summary } = project;
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium text-brand">최종 확인</p>
      <h3 className="mt-1 text-lg font-semibold">{summary.title || project.title}</h3>
      {summary.one_liner && <p className="mt-0.5 text-sm text-muted-foreground">{summary.one_liner}</p>}
      <div className="mt-4">
        <AreaList summary={summary} coverage={project.coverage} />
      </div>
      {summary.final_changes.length > 0 && (
        <div className="mt-4 rounded-lg bg-muted/60 px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">추가·수정한 내용</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {summary.final_changes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        &ldquo;아직 정하지 않았어요&rdquo; 항목은 PRD의 &lsquo;미결 사항&rsquo;으로 들어가요. 고칠 부분이 있으면 아래
        입력창에 적어 주세요.
      </p>
      <Button
        onClick={onMakePrd}
        size="lg"
        className="mt-4 h-11 w-full rounded-xl bg-brand text-base text-brand-foreground hover:bg-brand/90"
      >
        <FileText />
        {done ? "결과 보기" : "이대로 PRD 만들기"}
      </Button>
    </div>
  );
}
