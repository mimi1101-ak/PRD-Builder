"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Download, FileArchive, Loader2, Lock, MessageSquare, RotateCcw } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { BlackHole } from "@/components/black-hole";
import { Markdown, headingId, splitHeadingNumber } from "@/components/markdown";
import { CopyButton, DocBody, TaskSteps, stepAnchor, type RewriteTarget } from "@/components/results/doc-body";
import { LockedPreview } from "@/components/results/locked-preview";
import { RewriteDialog } from "@/components/results/rewrite-dialog";
import {
  DOC_FILES,
  DOC_KINDS,
  DOC_LABELS,
  REWRITES_PER_CREDIT,
  rewritesLeftLabel,
  type DocKind,
  type ProjectView,
} from "@/lib/domain";
import { downloadText, downloadZip, slugify } from "@/lib/download";
import { parseTaskSteps, splitSections } from "@/lib/markdown";
import { readJsonError, readNdjson } from "@/lib/ndjson";
import { cn } from "@/lib/utils";
import type { DocState } from "@/lib/projects";

type UiStatus = "missing" | "generating" | "waiting" | "ready" | "failed";
type DocUi = { status: UiStatus; content: string; rewriteCount: number; error?: string; errorCode?: string };
type Docs = Record<DocKind, DocUi>;

type GenerateEvent =
  | { type: "text"; delta: string }
  | {
      type: "done";
      document: { kind: DocKind; content: string; rewriteCount: number };
      unlocked: boolean;
      credits: number;
    }
  | { type: "error"; message: string; retryable: boolean; code?: string };

type DocumentsResponse = {
  project: ProjectView;
  documents: Record<DocKind, DocState | null>;
  rewritesLeft: number;
  credits: number;
};

const STALE_LOCK_MS = 5.5 * 60 * 1000;

function toUi(doc: DocState | null): DocUi {
  if (!doc) return { status: "missing", content: "", rewriteCount: 0 };
  if (doc.status === "generating") {
    // 5분 넘게 "생성 중"이면 멈춘 것으로 보고 다시 만들 수 있게 한다
    const stale = Date.now() - new Date(doc.updatedAt).getTime() > STALE_LOCK_MS;
    return { status: stale ? "failed" : "waiting", content: "", rewriteCount: doc.rewriteCount };
  }
  if (doc.status === "failed" || !doc.content) {
    return { status: "failed", content: "", rewriteCount: doc.rewriteCount };
  }
  return { status: "ready", content: doc.content, rewriteCount: doc.rewriteCount };
}

export function ResultView({
  project: initialProject,
  initialDocs,
  initialCredits,
  initialRewritesLeft,
  isDeveloper = false,
}: {
  project: ProjectView;
  initialDocs: Record<DocKind, DocState | null>;
  initialCredits: number;
  initialRewritesLeft: number;
  // 개발자 계정: 크레딧 차감 없이 바로 잠금 해제 (확인 창 생략)
  isDeveloper?: boolean;
}) {
  const projectId = initialProject.id;
  const [project, setProject] = useState(initialProject);
  const [docs, setDocs] = useState<Docs>(() => ({
    prd: toUi(initialDocs.prd),
    tasks: toUi(initialDocs.tasks),
    claude_md: toUi(initialDocs.claude_md),
  }));
  const [unlocked, setUnlocked] = useState(initialProject.unlocked);
  const [credits, setCredits] = useState(initialCredits);
  const [rewritesLeft, setRewritesLeft] = useState(initialRewritesLeft);
  const [tab, setTab] = useState<DocKind>("prd");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rewrite, setRewrite] = useState<{ kind: DocKind; target: RewriteTarget } | null>(null);

  // 크레딧이 바뀌면 헤더(서버 컴포넌트)의 숫자도 다시 그린다
  const router = useRouter();
  const shownCredits = useRef(initialCredits);
  useEffect(() => {
    if (credits === shownCredits.current) return;
    shownCredits.current = credits;
    router.refresh();
  }, [credits, router]);

  const docsRef = useRef(docs);
  const unlockedRef = useRef(unlocked);
  useEffect(() => {
    docsRef.current = docs;
    unlockedRef.current = unlocked;
  }, [docs, unlocked]);
  const inFlight = useRef<Partial<Record<DocKind, boolean>>>({});
  const pending = useRef<Partial<Record<DocKind, string>>>({});
  const frame = useRef<number | null>(null);

  const patchDoc = useCallback((kind: DocKind, patch: Partial<DocUi>) => {
    setDocs((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));
  }, []);

  // 스트리밍 글자를 화면 주사율에 맞춰 모아서 그린다
  const pushText = useCallback((kind: DocKind, text: string) => {
    pending.current[kind] = text;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const snapshot = { ...pending.current };
      setDocs((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(snapshot) as DocKind[]) {
          if (next[k].status === "generating") next[k] = { ...next[k], content: snapshot[k] ?? "" };
        }
        return next;
      });
    });
  }, []);

  const refresh = useCallback(async (): Promise<DocumentsResponse | null> => {
    try {
      const res = await fetch(`/api/documents?projectId=${projectId}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as DocumentsResponse;
      setProject(data.project);
      setUnlocked(data.project.unlocked);
      setCredits(data.credits);
      setRewritesLeft(data.rewritesLeft);
      setDocs((prev) => {
        const next = { ...prev };
        for (const kind of DOC_KINDS) {
          if (inFlight.current[kind]) continue; // 이 창에서 만드는 중이면 건드리지 않음
          next[kind] = toUi(data.documents[kind]);
        }
        return next;
      });
      return data;
    } catch {
      return null;
    }
  }, [projectId]);

  // 문서 하나를 만든다. 실패하면 자동으로 1번 더 시도하고, 그래도 실패하면 "다시 시도" 버튼 (PRD 9장)
  const generate = useCallback(
    async (kind: DocKind): Promise<boolean> => {
      if (inFlight.current[kind]) return false;

      for (let attempt = 0; attempt < 2; attempt++) {
        inFlight.current[kind] = true;
        patchDoc(kind, { status: "generating", content: "", error: undefined, errorCode: undefined });

        let ok = false;
        let exists = false;
        let waiting = false;
        let failure: { message: string; retryable: boolean; code?: string } | null = null;

        try {
          const res = await fetch("/api/documents/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, kind }),
          });
          if (!res.ok) {
            const err = await readJsonError(res);
            if (err.code === "exists") ok = exists = true;
            else if (err.code === "generating") waiting = true;
            else failure = { message: err.message, retryable: false, code: err.code };
          } else {
            let text = "";
            await readNdjson<GenerateEvent>(res, (ev) => {
              if (ev.type === "text") {
                text += ev.delta;
                pushText(kind, text);
              } else if (ev.type === "done") {
                ok = true;
                setUnlocked(ev.unlocked);
                setCredits(ev.credits);
                patchDoc(kind, {
                  status: "ready",
                  content: ev.document.content,
                  rewriteCount: ev.document.rewriteCount,
                });
              } else if (ev.type === "error") {
                failure = { message: ev.message, retryable: ev.retryable, code: ev.code };
              }
            });
            if (!ok && !failure) failure = { message: "연결이 끊겼어요. 다시 시도해 주세요.", retryable: true };
          }
        } catch {
          failure = { message: "연결이 끊겼어요. 다시 시도해 주세요.", retryable: true };
        }

        inFlight.current[kind] = false;

        if (exists) await refresh(); // 다른 창에서 이미 만들었으면 내용을 불러온다
        if (waiting) {
          patchDoc(kind, { status: "waiting" });
          return false;
        }
        if (!failure) return ok;

        const f: { message: string; retryable: boolean; code?: string } = failure;
        if (f.retryable && attempt === 0) continue;
        patchDoc(kind, { status: "failed", content: "", error: f.message, errorCode: f.code });
        return false;
      }
      return false;
    },
    [patchDoc, projectId, pushText, refresh],
  );

  const generatePaidDocs = useCallback(async () => {
    for (const kind of ["tasks", "claude_md"] as const) {
      const status = docsRef.current[kind].status;
      if (status === "ready" || status === "waiting") continue;
      const ok = await generate(kind);
      if (!ok) return false;
    }
    return true;
  }, [generate]);

  // 처음 들어오면: PRD가 없으면 만들고, 잠금 해제된 프로젝트면 나머지도 만든다
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const prd = docsRef.current.prd.status;
      if (prd === "missing" || prd === "failed") {
        const ok = await generate("prd");
        if (!ok) return;
      }
      if (unlockedRef.current) await generatePaidDocs();
    })();
  }, [generate, generatePaidDocs]);

  // 다른 창에서 만드는 중이면 4초마다 확인
  const anyWaiting = DOC_KINDS.some((k) => docs[k].status === "waiting");
  useEffect(() => {
    if (!anyWaiting) return;
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [anyWaiting, refresh]);

  async function unlock() {
    setConfirmOpen(false);
    setTab("tasks");
    const ok = await generatePaidDocs();
    if (ok) toast.success("작업 단계와 CLAUDE.md가 열렸어요");
  }

  function askUnlock() {
    if (isDeveloper) void unlock();
    else setConfirmOpen(true);
  }

  async function downloadAll() {
    if (!unlocked) {
      askUnlock();
      return;
    }
    const files = DOC_KINDS.filter((k) => docs[k].status === "ready").map((k) => ({
      path: DOC_FILES[k].zipPath,
      content: docs[k].content,
    }));
    if (files.length < 3) {
      toast.error("세 문서가 모두 만들어진 뒤에 받을 수 있어요.");
      return;
    }
    await downloadZip(`${slugify(project.title)}-docs.zip`, files);
  }

  const paidBusy = docs.tasks.status === "generating" || docs.claude_md.status === "generating";
  const allReady = DOC_KINDS.every((k) => docs[k].status === "ready");
  const isLocked = (kind: DocKind) =>
    kind !== "prd" && !unlocked && docs[kind].status !== "generating" && docs[kind].status !== "failed";
  const active = docs[tab];
  const activeFile = DOC_FILES[tab];
  const showTools = active.status === "ready" && !isLocked(tab);

  function moveTab(e: React.KeyboardEvent, kind: DocKind) {
    const i = DOC_KINDS.indexOf(kind);
    const next = e.key === "ArrowRight" ? DOC_KINDS[(i + 1) % 3] : e.key === "ArrowLeft" ? DOC_KINDS[(i + 2) % 3] : null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <main className="relative w-full">
      <BlackHole variant="corner" />
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pb-28 pt-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="mono-label flex gap-3.5 text-muted-foreground">
              <span>Result</span>
              <span>{formatDate(project.createdAt)}</span>
            </p>
            <h1 className="display-title mt-4 break-keep text-[clamp(40px,6vw,80px)]">{project.title}</h1>
            {project.summary.one_liner && (
              <p className="mt-3 text-[15.5px] text-muted-foreground">{project.summary.one_liner}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button asChild variant="ghost">
              <Link href={`/p/${projectId}/chat`}>
                <MessageSquare /> 대화 보기
              </Link>
            </Button>
            <Button onClick={downloadAll} disabled={unlocked && !allReady}>
              {unlocked ? <FileArchive /> : <Lock />}세 파일 한 번에 받기 (.zip)
            </Button>
          </div>
        </div>

        <div className="mt-11 flex items-center gap-3 border-b">
          <div role="tablist" aria-label="문서" className="flex gap-6 overflow-x-auto [scrollbar-width:none] sm:gap-8">
            {DOC_KINDS.map((kind, i) => (
              <button
                key={kind}
                id={`tab-${kind}`}
                type="button"
                role="tab"
                aria-selected={tab === kind}
                aria-controls={`panel-${kind}`}
                tabIndex={tab === kind ? 0 : -1}
                onClick={() => setTab(kind)}
                onKeyDown={(e) => moveTab(e, kind)}
                className={cn(
                  "relative flex items-center gap-2.5 whitespace-nowrap pb-[15px] pt-4 text-[14.5px] text-muted-foreground transition-colors hover:text-foreground",
                  tab === kind &&
                    "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground",
                )}
              >
                <span className="font-mono text-[10.5px]">{String(i + 1).padStart(2, "0")}</span>
                {DOC_FILES[kind].name}
                {kind !== "prd" && !unlocked && <Lock className="size-3" />}
                {docs[kind].status === "generating" && <Loader2 className="size-3 animate-spin" />}
              </button>
            ))}
          </div>
          {showTools && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <span className="mr-2 hidden font-mono text-[11px] text-ink-4 md:inline">
                {tab === "claude_md" ? "프로젝트 맨 위 CLAUDE.md" : `${activeFile.zipPath} 로 저장`}
              </span>
              <CopyButton text={active.content} />
              <Button size="sm" variant="ghost" onClick={() => downloadText(activeFile.name, active.content)}>
                <Download /> .md
              </Button>
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-[clamp(24px,6vw,96px)] lg:grid-cols-[210px_minmax(0,1fr)]">
          <Toc kind={tab} doc={active} locked={isLocked(tab)} />
          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-w-0 max-w-[740px]">
            {isLocked(tab) ? (
              <LockedPreview
                kind={tab as Exclude<DocKind, "prd">}
                credits={credits}
                projectId={projectId}
                busy={paidBusy}
                onUnlock={askUnlock}
                isDeveloper={isDeveloper}
              />
            ) : (
              <DocPanel
                kind={tab}
                doc={active}
                projectId={projectId}
                unlocked={unlocked}
                rewritesLeft={rewritesLeft}
                onRetry={() => (tab === "prd" ? void generate("prd") : void generatePaidDocs())}
                onRewrite={(target) => setRewrite({ kind: tab, target })}
              />
            )}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-light tracking-[-0.03em]">크레딧 1건을 사용할까요?</DialogTitle>
            <DialogDescription>
              이 프로젝트의 작업 단계와 CLAUDE.md를 만들고, zip 다운로드와 섹션 다시 쓰기 {REWRITES_PER_CREDIT}회를 쓸
              수 있어요. 한 번 연 프로젝트는 계속 볼 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border px-4 py-3 text-sm">
            남은 크레딧 <b>{credits}건</b> → <b>{Math.max(0, credits - 1)}건</b>
            <p className="mt-1 text-xs text-muted-foreground">문서 생성에 실패하면 크레딧은 차감되지 않아요.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            {credits > 0 ? (
              <Button onClick={unlock}>크레딧 1건 사용</Button>
            ) : (
              <Button asChild>
                <Link href={`/credits?next=${encodeURIComponent(`/p/${projectId}`)}`}>크레딧 구매하기</Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RewriteDialog
        key={rewrite ? `${rewrite.kind}:${rewrite.target.heading}` : "closed"}
        projectId={projectId}
        kind={rewrite?.kind ?? "prd"}
        target={rewrite?.target ?? null}
        rewritesLeft={rewritesLeft}
        onClose={() => setRewrite(null)}
        onDone={(content, rewriteCount, left) => {
          if (rewrite) patchDoc(rewrite.kind, { content, rewriteCount, status: "ready" });
          setRewritesLeft(left);
        }}
      />
    </main>
  );
}

function formatDate(iso: string) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}

type TocItem = { id: string; no: string; label: string };

// 왼쪽 목차: PRD·CLAUDE.md 는 "## 섹션", 작업 단계는 단계 카드로 건너뛴다 (넓은 화면에서만)
function Toc({ kind, doc, locked }: { kind: DocKind; doc: DocUi; locked: boolean }) {
  const items = useMemo<TocItem[]>(() => {
    if (locked || !doc.content) return [];
    if (kind === "tasks") {
      const parsed = parseTaskSteps(doc.content);
      if (parsed) {
        return parsed.steps.map((s) => ({
          id: stepAnchor(s.number),
          no: String(s.number).padStart(2, "0"),
          label: s.title,
        }));
      }
    }
    return splitSections(doc.content).map((s, i) => {
      const parts = splitHeadingNumber(s.title.replace(/[*_`]/g, ""));
      return {
        id: headingId(s.title),
        no: parts?.no ?? String(i + 1).padStart(2, "0"),
        label: parts?.rest ?? s.title.replace(/[*_`]/g, ""),
      };
    });
  }, [kind, doc.content, locked]);
  const activeId = useActiveId(items);

  return (
    <nav aria-label="목차" className="hidden self-start lg:sticky lg:top-[calc(3.5rem+28px)] lg:block">
      {items.length > 0 && (
        <>
          <span className="mono-label mb-3 block text-[10px] text-ink-4">
            {kind === "tasks" ? `Steps · ${items.length}` : "Contents"}
          </span>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={cn(
                    "grid grid-cols-[30px_minmax(0,1fr)] py-[7px] text-[13.5px] text-muted-foreground transition-colors hover:text-foreground",
                    activeId === item.id && "text-foreground",
                  )}
                >
                  <span className="pt-0.5 font-mono text-[11px]">{item.no}</span>
                  <span className="truncate">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}

// 화면 위쪽 30% 선을 지난 마지막 제목을 "지금 읽는 곳"으로 본다
function useActiveId(items: TocItem[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const ids = items.map((i) => i.id).join("|");
  useEffect(() => {
    const list = ids ? ids.split("|") : [];
    if (!list.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.3) current = id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);
  return activeId;
}

function DocPanel({
  kind,
  doc,
  projectId,
  unlocked,
  rewritesLeft,
  onRetry,
  onRewrite,
}: {
  kind: DocKind;
  doc: DocUi;
  projectId: string;
  unlocked: boolean;
  rewritesLeft: number;
  onRetry: () => void;
  onRewrite: (target: RewriteTarget) => void;
}) {
  if (doc.status === "generating") {
    return (
      <div>
        <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {DOC_LABELS[kind]}를 쓰고 있어요. 1~2분 정도 걸려요.
        </p>
        {doc.content ? (
          <Markdown>{doc.content}</Markdown>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}
      </div>
    );
  }

  if (doc.status === "waiting") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> 다른 창에서 이 문서를 만드는 중이에요. 끝나면 여기에 바로 보여요.
      </div>
    );
  }

  if (doc.status === "failed" || doc.status === "missing") {
    const noRetry = doc.errorCode === "free_limit";
    return (
      <div className="rounded-2xl border p-6">
        <p className="flex items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          {doc.error ?? `${DOC_LABELS[kind]}를 아직 만들지 못했어요.`}
        </p>
        <div className="mt-4 flex gap-2">
          {doc.errorCode === "no_credit" ? (
            <Button asChild size="sm">
              <Link href={`/credits?next=${encodeURIComponent(`/p/${projectId}`)}`}>크레딧 구매하기</Link>
            </Button>
          ) : (
            !noRetry && (
              <Button size="sm" onClick={onRetry}>
                <RotateCcw /> 다시 시도
              </Button>
            )
          )}
        </div>
      </div>
    );
  }

  const file = DOC_FILES[kind];
  const canRewrite = unlocked && rewritesLeft > 0;
  return (
    <div>
      <p className="mb-5 font-mono text-[11px] text-ink-4">
        {kind === "claude_md" ? "프로젝트 폴더 맨 위에 CLAUDE.md 로 저장" : `프로젝트 폴더의 ${file.zipPath} 로 저장`}
        {unlocked && ` · 다시 쓰기 ${rewritesLeftLabel(rewritesLeft)}`}
      </p>
      {kind === "tasks" ? (
        <TaskSteps projectId={projectId} content={doc.content} onRewrite={canRewrite ? onRewrite : undefined} />
      ) : (
        <DocBody content={doc.content} onRewrite={canRewrite ? onRewrite : undefined} />
      )}
    </div>
  );
}
