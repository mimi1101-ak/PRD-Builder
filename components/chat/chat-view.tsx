"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, FileText, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlackHole } from "@/components/black-hole";
import { ChatMarkdown } from "@/components/markdown";
import { LoginDialog } from "@/components/login-dialog";
import { Momo } from "@/components/momo";
import { AreaList, MobileSummary, SummaryPanel } from "@/components/chat/summary-panel";
import {
  DONT_KNOW_MESSAGE,
  MAX_INPUT_LENGTH,
  MAX_QUESTIONS,
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

  const progress = finalCheck || done ? 100 : (Math.min(questionCount, MAX_QUESTIONS) / MAX_QUESTIONS) * 100;

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-0">
      <BlackHole variant="corner" />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-3 px-4 pb-3 pt-3.5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3 text-sm font-semibold">
              <span className="mono-label shrink-0 text-muted-foreground">Interview</span>
              <span className="truncate">{project.summary.title || project.title}</span>
            </div>
            <span className="mono-label shrink-0 text-muted-foreground">
              {finalCheck || done
                ? "Final check"
                : `Q ${String(Math.min(questionCount, MAX_QUESTIONS)).padStart(2, "0")} / ${MAX_QUESTIONS}`}
            </span>
          </div>
          <div className="relative h-px bg-border">
            <i
              className="absolute -top-px left-0 h-0.5 bg-foreground transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <MobileSummary
          title={project.title}
          summary={project.summary}
          coverage={project.coverage}
          questionCount={questionCount}
          finalCheck={finalCheck || done}
        />

        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[760px] space-y-8 px-4 py-9 sm:px-8">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {streaming !== null && (
              <AiBubble>
                {streaming ? (
                  <ChatMarkdown className="text-[15.5px] leading-[1.8] text-ink-2">
                    {stripTrailingList(streaming) + " ▍"}
                  </ChatMarkdown>
                ) : (
                  <span className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                    <Thinking /> 생각하고 있어요…
                  </span>
                )}
              </AiBubble>
            )}

            {(finalCheck || done) && !busy && lastAi && (
              <FinalCheckCard project={project} done={done} onMakePrd={makePrd} />
            )}

            {failure && (
              <div className="flex flex-col items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
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

        <div className="shrink-0 bg-linear-to-t from-background from-70% to-background/0">
          <div className="mx-auto w-full max-w-[760px] px-4 pb-4 pt-3 sm:px-8 sm:pb-5">
            {done ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-line-strong bg-background px-4 py-3 text-sm">
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
                  <div className="mb-3 flex flex-wrap gap-2">
                    {options.map((option, i) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => void send(option)}
                        className="group inline-flex min-h-10 items-center gap-2.5 rounded-full border border-line-strong bg-background py-1 pl-[5px] pr-4 text-left text-sm transition-colors hover:border-foreground"
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[11px] text-muted-foreground transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {option}
                      </button>
                    ))}
                    {!finalCheck && lastAi && (
                      <button
                        type="button"
                        onClick={() => void send(DONT_KNOW_MESSAGE)}
                        className="inline-flex min-h-10 items-center rounded-full border border-dashed border-line-strong bg-background px-4 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                      >
                        잘 모르겠어요 (추천해 주세요)
                      </button>
                    )}
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitInput();
                  }}
                  className="flex items-end gap-2 rounded-2xl border border-line-strong bg-background p-1.5 transition-[border-color,box-shadow] duration-200 focus-within:border-foreground focus-within:shadow-[0_0_0_6px_rgba(11,11,11,0.045)]"
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
                    aria-label="답변"
                    placeholder={finalCheck ? "더 넣고 싶은 기능이나 고칠 부분을 적어 주세요" : "직접 답을 적어도 돼요"}
                    className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15.5px] outline-none placeholder:text-ink-4 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!canType || !input.trim()}
                    aria-label="보내기"
                    className="mb-px grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background transition-colors disabled:bg-paper-3 disabled:text-ink-4"
                  >
                    {busy ? <Loader2 className="size-[18px] animate-spin" /> : <ArrowUp className="size-[18px]" />}
                  </button>
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

// 픽셀 세 칸이 차례로 깜빡이는 "생각 중" 표시 (움직임 줄이기 설정이면 멈춘다)
function Thinking() {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <i
          key={delay}
          className="size-[5px] animate-[thinking_1.2s_infinite_both] bg-foreground"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3.5">
      <Momo className="-mt-1 w-9" />
      <div className="min-w-0">
        <p className="mono-label mb-2 text-muted-foreground">MOMO</p>
        {children}
      </div>
    </div>
  );
}

// AI 메시지는 "요약 문단 + 질문 문단"이다. 마지막 문단이 물음표로 끝나면,
// 그 문단에서 처음 물음표가 나오는 문장부터 끝까지를 질문으로 크게 보여 준다.
function splitQuestion(text: string) {
  const paragraphs = text.trim().split(/\n\s*\n/);
  const last = paragraphs.pop()?.trim() ?? "";
  if (!/[?？]\s*$/.test(last)) return { body: text, question: null };
  const sentences = last.split(/(?<=[.!?？。])\s+/);
  const first = sentences.findIndex((s) => /[?？]\s*$/.test(s));
  const lead = sentences.slice(0, first).join(" ");
  return {
    body: [...paragraphs, lead].filter(Boolean).join("\n\n"),
    question: sentences.slice(first).join(" "),
  };
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "ai") {
    const { body, question } = splitQuestion(stripTrailingList(message.content));
    return (
      <AiBubble>
        {body && <ChatMarkdown className="text-[15.5px] leading-[1.8] text-ink-2">{body}</ChatMarkdown>}
        {question && (
          <ChatMarkdown className="mt-3 text-[15.5px] font-medium leading-[1.8] text-foreground">

            {question}
          </ChatMarkdown>
        )}
      </AiBubble>
    );
  }
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-[18px] rounded-br-[4px] bg-muted px-[18px] py-3 text-[15.5px] leading-[1.7]",
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
    <div className="rounded-[20px] border border-foreground bg-background p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.3)]">
      <p className="mono-label text-muted-foreground">Final check</p>
      <h3 className="mt-3 font-display text-[28px] font-light leading-tight tracking-[-0.03em]">
        {summary.title || project.title}
      </h3>
      {summary.one_liner && <p className="mt-1 text-sm text-muted-foreground">{summary.one_liner}</p>}
      <div className="mt-5">
        <AreaList summary={summary} coverage={project.coverage} />
      </div>
      {summary.final_changes.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">추가·수정한 내용</p>
          <ul className="mt-1.5 space-y-0.5 text-sm">
            {summary.final_changes.map((c, i) => (
              <li key={i} className="relative pl-5 before:absolute before:left-0 before:text-ink-4 before:content-['—']">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        &ldquo;아직 정하지 않았어요&rdquo; 항목은 PRD의 &lsquo;미결 사항&rsquo;으로 들어가요. 고칠 부분이 있으면 아래
        입력창에 적어 주세요.
      </p>
      <Button onClick={onMakePrd} size="lg" className="mt-4 w-full">
        <FileText />
        {done ? "결과 보기" : "이대로 PRD 만들기"}
      </Button>
    </div>
  );
}
