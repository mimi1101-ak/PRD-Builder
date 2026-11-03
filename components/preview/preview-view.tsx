"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Download, Loader2, RotateCcw } from "lucide-react";
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
import { BlackHole } from "@/components/black-hole";
import { CopyButton } from "@/components/results/doc-body";
import { PRODUCTS } from "@/lib/domain";
import { downloadBlob } from "@/lib/download";
import {
  PREVIEW_FILE_PATH,
  PREVIEW_KIT_DESCRIPTIONS,
  PREVIEW_KIT_FONTS,
  PREVIEW_KIT_LABELS,
  PREVIEW_KITS,
  PREVIEW_MESSAGE_FROM_APP,
  PREVIEW_MESSAGE_FROM_HOST,
  PREVIEW_REFERENCE_PROMPT,
  PREVIEW_SCREENS,
  PREVIEW_SCREEN_LABELS,
  PREVIEW_STAGES,
  PREVIEW_STAGE_LABELS,
  type PreviewKit,
  type PreviewStage,
  type PreviewState,
} from "@/lib/preview";
import { readJsonError, readNdjson } from "@/lib/ndjson";
import { cn } from "@/lib/utils";

type Phase =
  | { kind: "intro" }
  | { kind: "generating"; stages: PreviewStage[]; restarted: boolean }
  | { kind: "waiting" } // 다른 창에서 만드는 중
  | { kind: "failed"; message: string; code?: string }
  | { kind: "ready"; doc: string; kit: PreviewKit | null; redesignUsed: boolean };

type PreviewEvent =
  | { type: "stage"; stage: PreviewStage }
  | { type: "restart" }
  | { type: "done"; doc: string; kit: PreviewKit; credits?: number; redesignUsed?: boolean }
  | { type: "error"; message: string; retryable: boolean; code?: string };

// 이름 뒤 조사: "잡지형으로", "앱형으로" (모두 받침 있는 이름이라 "으로")
const kitWith = (kit: PreviewKit) => `${PREVIEW_KIT_LABELS[kit]}으로`;

const STALE_LOCK_MS = 5.5 * 60 * 1000;

function initialPhase(state: PreviewState | null): Phase {
  if (!state) return { kind: "intro" };
  if (state.status === "ready" && state.doc) {
    return { kind: "ready", doc: state.doc, kit: state.kit, redesignUsed: state.redesignUsed };
  }
  if (state.status === "generating" && Date.now() - new Date(state.updatedAt).getTime() < STALE_LOCK_MS) {
    return { kind: "waiting" };
  }
  return { kind: "intro" };
}

export function PreviewView({
  projectId,
  title,
  initialPreview,
  sampleDoc,
  initialCredits,
  isDeveloper = false,
}: {
  projectId: string;
  title: string;
  initialPreview: PreviewState | null;
  // 만들기 전 화면에 보여 줄 예시 문서 (이미 만들었으면 null)
  sampleDoc: string | null;
  initialCredits: number;
  // 개발자 계정: 크레딧 차감 없이 바로 만든다 (확인 창 생략)
  isDeveloper?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(() => initialPhase(initialPreview));
  const [credits, setCredits] = useState(initialCredits);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inFlight = useRef(false);
  // 디자인 바꾸기: 입혀 보는 디자인, 다시 만드는 중 진행, 실패 문구, 확인 창
  const [trialKit, setTrialKit] = useState<PreviewKit | null>(null);
  const [redesigning, setRedesigning] = useState<{ stages: PreviewStage[]; restarted: boolean } | null>(null);
  const [redesignError, setRedesignError] = useState<string | null>(null);
  const [redesignConfirm, setRedesignConfirm] = useState(false);

  // 크레딧이 바뀌면 헤더(서버 컴포넌트)의 숫자도 다시 그린다
  const router = useRouter();
  const shownCredits = useRef(initialCredits);
  useEffect(() => {
    if (credits === shownCredits.current) return;
    shownCredits.current = credits;
    router.refresh();
  }, [credits, router]);

  // 다른 창에서 만드는 중이면 4초마다 확인하고, 끝나면 화면을 새로 불러온다
  const check = useCallback(async () => {
    try {
      const res = await fetch(`/api/preview?projectId=${projectId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { status: PreviewState["status"] | null; credits: number };
      setCredits(data.credits);
      if (data.status === "ready") window.location.reload();
      else if (data.status !== "generating") setPhase({ kind: "intro" });
    } catch {
      // 다음 확인 때 다시
    }
  }, [projectId]);

  useEffect(() => {
    if (phase.kind !== "waiting") return;
    const timer = setInterval(() => void check(), 4000);
    return () => clearInterval(timer);
  }, [phase.kind, check]);

  // 실패하면 자동으로 1번 더 시도하고, 그래도 실패하면 "다시 시도" 버튼 (문서 생성과 같은 방식)
  async function generate() {
    if (inFlight.current) return;
    setConfirmOpen(false);
    for (let attempt = 0; attempt < 2; attempt++) {
      inFlight.current = true;
      setPhase({ kind: "generating", stages: [], restarted: false });
      let done: { doc: string; kit: PreviewKit } | null = null;
      let failure: { message: string; retryable: boolean; code?: string } | null = null;
      let after: "reload" | "waiting" | null = null;

      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (!res.ok) {
          const err = await readJsonError(res);
          if (err.code === "exists") after = "reload";
          else if (err.code === "generating") after = "waiting";
          else failure = { message: err.message, retryable: false, code: err.code };
        } else {
          await readNdjson<PreviewEvent>(res, (ev) => {
            if (ev.type === "stage") {
              setPhase((p) =>
                p.kind === "generating" && !p.stages.includes(ev.stage) ? { ...p, stages: [...p.stages, ev.stage] } : p,
              );
            } else if (ev.type === "restart") {
              setPhase({ kind: "generating", stages: [], restarted: true });
            } else if (ev.type === "done") {
              done = { doc: ev.doc, kit: ev.kit };
              if (typeof ev.credits === "number") setCredits(ev.credits);
            } else if (ev.type === "error") failure = { message: ev.message, retryable: ev.retryable, code: ev.code };
          });
          if (!done && !failure) failure = { message: "연결이 끊겼어요. 다시 시도해 주세요.", retryable: true };
        }
      } catch {
        failure = { message: "연결이 끊겼어요. 다시 시도해 주세요.", retryable: true };
      }

      inFlight.current = false;
      if (after === "reload") return window.location.reload();
      if (after === "waiting") return setPhase({ kind: "waiting" });
      const result = done as { doc: string; kit: PreviewKit } | null;
      if (result) {
        setPhase({ kind: "ready", doc: result.doc, kit: result.kit, redesignUsed: false });
        toast.success("화면 미리보기가 만들어졌어요");
        return;
      }
      const f = failure as { message: string; retryable: boolean; code?: string } | null;
      if (f?.retryable && attempt === 0) continue;
      setPhase({ kind: "failed", message: f?.message ?? "미리보기를 만들지 못했어요.", code: f?.code });
      return;
    }
  }

  function askGenerate() {
    if (isDeveloper) void generate();
    else setConfirmOpen(true);
  }

  // 고른 디자인으로 다시 만들기. 실패하면 지금 미리보기와 기회는 그대로 남는다
  async function redesign() {
    if (!trialKit || redesigning) return;
    const kit = trialKit;
    setRedesignConfirm(false);
    setRedesignError(null);
    setRedesigning({ stages: [], restarted: false });
    let done: { doc: string; kit: PreviewKit } | null = null;
    let failure: string | null = null;
    try {
      const res = await fetch("/api/preview/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kit }),
      });
      if (!res.ok) {
        failure = (await readJsonError(res)).message;
      } else {
        await readNdjson<PreviewEvent>(res, (ev) => {
          if (ev.type === "stage") {
            setRedesigning((r) => (r && !r.stages.includes(ev.stage) ? { ...r, stages: [...r.stages, ev.stage] } : r));
          } else if (ev.type === "restart") setRedesigning({ stages: [], restarted: true });
          else if (ev.type === "done") done = { doc: ev.doc, kit: ev.kit };
          else if (ev.type === "error") failure = ev.message;
        });
        if (!done && !failure) failure = "연결이 끊겼어요. 다시 시도해 주세요.";
      }
    } catch {
      failure = "연결이 끊겼어요. 다시 시도해 주세요.";
    }
    setRedesigning(null);
    const result = done as { doc: string; kit: PreviewKit } | null;
    if (result) {
      setTrialKit(null);
      setPhase({ kind: "ready", doc: result.doc, kit: result.kit, redesignUsed: true });
      toast.success(`${kitWith(result.kit)} 다시 만들었어요`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setRedesignError(`${failure ?? "다시 만들지 못했어요."} 지금 미리보기와 디자인 바꾸기 기회는 그대로 남아 있어요.`);
  }

  function askRedesign() {
    if (isDeveloper) void redesign();
    else setRedesignConfirm(true);
  }

  return (
    <main className="relative w-full">
      <BlackHole variant="corner" />
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pb-28 pt-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="mono-label flex gap-3.5 text-muted-foreground">
              <span>Preview</span>
              {/* 결과물이 생성형 AI 로 만든 것임을 표시 (AI 기본법, 약관 제6조) */}
              <span>AI 생성</span>
              <span>가짜 데이터</span>
            </p>
            <h1 className="display-title mt-4 break-keep text-[clamp(40px,6vw,80px)]">{title}</h1>
            <p className="mt-3 text-[15.5px] text-muted-foreground">
              화면 미리보기
              {phase.kind === "ready" && phase.kit && ` · ${PREVIEW_KIT_LABELS[phase.kit]} 디자인`}
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href={`/p/${projectId}`}>
              <ArrowLeft /> 결과 문서로
            </Link>
          </Button>
        </div>

        <div className="mt-11 border-t pt-10">
          {phase.kind === "ready" ? (
            redesigning ? (
              <Progress
                stages={redesigning.stages}
                restarted={redesigning.restarted}
                heading={trialKit ? `${kitWith(trialKit)} 다시 만들고 있어요. 1분 정도 걸려요.` : undefined}
              />
            ) : (
              <>
                {redesignError && (
                  <p className="mb-8 flex max-w-[720px] items-start gap-2 text-sm">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    {redesignError}
                  </p>
                )}
                <PreviewFrame doc={phase.doc} kit={phase.kit} trialKit={trialKit} />
                <RedesignPanel
                  currentKit={phase.kit}
                  used={phase.redesignUsed && !isDeveloper}
                  isDeveloper={isDeveloper}
                  trialKit={trialKit}
                  onTry={(kit) => setTrialKit(kit === phase.kit ? null : kit)}
                  onStart={askRedesign}
                />
                <ReferenceGuide doc={phase.doc} />
              </>
            )
          ) : phase.kind === "generating" ? (
            <Progress stages={phase.stages} restarted={phase.restarted} />
          ) : phase.kind === "waiting" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> 다른 창에서 미리보기를 만드는 중이에요. 끝나면 여기에 바로 보여요.
            </p>
          ) : (
            <>
              {phase.kind === "failed" && (
                <div className="mb-10 flex max-w-[640px] flex-wrap items-start gap-x-3 gap-y-3 border-b pb-8">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="min-w-0 flex-1 text-sm">{phase.message}</p>
                  {phase.code !== "no_credit" && (
                    <Button size="sm" onClick={() => void generate()}>
                      <RotateCcw /> 다시 시도
                    </Button>
                  )}
                </div>
              )}
              <Intro credits={credits} projectId={projectId} isDeveloper={isDeveloper} onStart={askGenerate} />
              {sampleDoc && (
                <div className="mt-16">
                  <p className="mono-label mb-5 text-muted-foreground">Example · 다른 아이디어(점심투표)로 만든 미리보기</p>
                  <PreviewFrame doc={sampleDoc} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-light tracking-[-0.03em]">크레딧 1건을 사용할까요?</DialogTitle>
            <DialogDescription>
              이 프로젝트의 홈·요금·기능·결과 화면을 직접 눌러 볼 수 있는 미리보기와 HTML 파일을 만들어요. 문서 잠금 해제와는
              따로 차감돼요. 한 번 만든 미리보기는 계속 볼 수 있고, 디자인이 마음에 들지 않으면 한 번은 다른 디자인으로 다시
              만들 수 있어요(크레딧 차감 없음).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border px-4 py-3 text-sm">
            남은 크레딧 <b>{credits}건</b> → <b>{Math.max(0, credits - 1)}건</b>
            {/* 디지털 콘텐츠 청약철회 제한 안내 (약관 제8조 2항) */}
            <p className="mt-1 text-xs text-muted-foreground">
              <b className="font-medium text-foreground">사용한 크레딧은 환불되지 않아요.</b> 미리보기를 만들지 못하면
              크레딧은 차감되지 않아요.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            {credits > 0 ? (
              <Button onClick={() => void generate()}>크레딧 1건 사용</Button>
            ) : (
              <Button asChild>
                <Link href={`/credits?next=${encodeURIComponent(`/p/${projectId}/preview`)}`}>크레딧 구매하기</Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={redesignConfirm} onOpenChange={setRedesignConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-light tracking-[-0.03em]">
              {trialKit ? `${kitWith(trialKit)} 다시 만들까요?` : "다시 만들까요?"}
            </DialogTitle>
            <DialogDescription>
              고른 디자인에 맞게 화면 구성까지 새로 만들어요. 지금 미리보기는 새로 만든 것으로 바뀌고 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border px-4 py-3 text-sm">
            <b>디자인 바꾸기는 미리보기마다 한 번만 할 수 있어요.</b>
            <p className="mt-1 text-xs text-muted-foreground">
              크레딧은 차감되지 않아요. 만들지 못하면 지금 미리보기와 기회는 그대로 남아요.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRedesignConfirm(false)}>
              취소
            </Button>
            <Button onClick={() => void redesign()}>다시 만들기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// 디자인이 마음에 들지 않을 때: 다섯 디자인 중 하나를 골라 지금 화면에 입혀 보고, 한 번 다시 만든다
function RedesignPanel({
  currentKit,
  used,
  isDeveloper,
  trialKit,
  onTry,
  onStart,
}: {
  currentKit: PreviewKit | null;
  used: boolean;
  isDeveloper: boolean;
  trialKit: PreviewKit | null;
  onTry: (kit: PreviewKit) => void;
  onStart: () => void;
}) {
  if (used) {
    return (
      <p className="mt-10 border-t pt-8 text-sm text-muted-foreground">
        디자인 바꾸기를 이미 썼어요. 디자인 바꾸기는 미리보기마다 한 번만 할 수 있어요.
      </p>
    );
  }
  const shown = trialKit ?? currentKit;
  return (
    <section className="mt-14 border-t pt-10">
      <div className="max-w-[640px]">
        <h2 className="break-keep text-[20px] font-semibold tracking-[-0.02em]">디자인이 마음에 들지 않으면 한 번 바꿀 수 있어요</h2>
        <p className="mt-3 break-keep text-[14.5px] leading-relaxed text-muted-foreground">
          디자인을 누르면 지금 화면에 바로 입혀 볼 수 있어요. 마음에 드는 디자인으로 다시 만들면 그 디자인에 맞게 화면 구성까지
          새로 짜요. 크레딧은 차감되지 않아요.
          {isDeveloper && " 개발자 계정은 여러 번 바꿀 수 있어요."}
        </p>
      </div>
      <div role="group" aria-label="디자인" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {PREVIEW_KITS.map((kit) => (
          <button
            key={kit}
            type="button"
            aria-pressed={shown === kit}
            onClick={() => onTry(kit)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors hover:border-foreground",
              shown === kit && "border-foreground bg-foreground text-background",
            )}
          >
            <span className="flex items-center justify-between gap-2 text-[14.5px] font-medium">
              {PREVIEW_KIT_LABELS[kit]}
              {kit === currentKit && <span className="mono-label text-[10px] opacity-70">지금</span>}
            </span>
            <span className={cn("mt-1 block text-[12.5px] leading-snug text-muted-foreground", shown === kit && "text-background/70")}>
              {PREVIEW_KIT_DESCRIPTIONS[kit]}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={onStart} disabled={!trialKit || trialKit === currentKit}>
          {trialKit && trialKit !== currentKit ? `${kitWith(trialKit)} 다시 만들기` : "바꿀 디자인을 골라 주세요"}
        </Button>
        {trialKit && (
          <Button variant="ghost" onClick={() => currentKit && onTry(currentKit)}>
            원래 디자인 보기
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          입혀 본 모습은 색·글꼴·모양만 바뀐 것이에요. 다시 만들면 구성까지 달라져요.
        </span>
      </div>
    </section>
  );
}

const INTRO_POINTS = [
  { label: "홈, 요금, 기능, 결과 화면을 직접 눌러 보기", meta: "4+ screens" },
  { label: "입력하고 저장하고 결제하는 흐름이 가짜 데이터로 움직여요", meta: "live" },
  { label: "PRD 톤에 맞춘 디자인, 마음에 안 들면 한 번 바꾸기", meta: "5 styles" },
  { label: "HTML 파일로 받아 AI 코딩 도구의 디자인 참고로", meta: ".html" },
];

function Intro({
  credits,
  projectId,
  isDeveloper,
  onStart,
}: {
  credits: number;
  projectId: string;
  isDeveloper: boolean;
  onStart: () => void;
}) {
  return (
    <section className="max-w-[560px]">
      <h2 className="break-keep text-[22px] font-semibold tracking-[-0.02em]">PRD로 실제로 눌러 볼 수 있는 화면을 만들어요</h2>
      <p className="mt-3 break-keep text-[15px] leading-relaxed text-muted-foreground">
        PRD를 읽고 이 서비스의 홈, 요금, 핵심 기능, 결과 화면을 작은 웹앱으로 만들어요. 데이터는 모두 가짜이고 실제 서버·결제는
        없어요. 완성됐을 때의 모습을 미리 써 보는 용도예요. 실제로 만들면 디자인은 달라질 수 있어요.
      </p>
      <ul className="mb-6 mt-6 border-t">
        {INTRO_POINTS.map((p) => (
          <li key={p.label} className="flex justify-between gap-3 border-b py-[11px] text-sm">
            <span>{p.label}</span>
            <span className="mono-label whitespace-nowrap text-[10.5px] text-muted-foreground">{p.meta}</span>
          </li>
        ))}
      </ul>
      {isDeveloper ? (
        <Button onClick={onStart} size="lg" className="h-12 w-full">
          바로 만들기 · 크레딧 무제한
        </Button>
      ) : credits > 0 ? (
        <Button onClick={onStart} size="lg" className="h-12 w-full">
          크레딧 1건으로 만들기 · 남은 크레딧 {credits}
        </Button>
      ) : (
        <Button asChild size="lg" className="h-12 w-full">
          <Link href={`/credits?next=${encodeURIComponent(`/p/${projectId}/preview`)}`}>
            크레딧 구매하기 · 1건 {PRODUCTS.credit_1.amount.toLocaleString()}원
          </Link>
        </Button>
      )}
      <p className="mt-3 break-keep text-xs leading-relaxed text-muted-foreground">
        {isDeveloper
          ? "개발자 계정은 크레딧이 차감되지 않아요"
          : "문서 잠금 해제와 따로 1건이 차감돼요. 만들지 못하면 차감되지 않아요. 1분 정도 걸려요."}
      </p>
    </section>
  );
}

function Progress({ stages, restarted, heading }: { stages: PreviewStage[]; restarted: boolean; heading?: string }) {
  const current = stages[stages.length - 1];
  return (
    <section className="max-w-[560px]">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {restarted
          ? "검사에서 빠진 곳이 있어 한 번 더 만들고 있어요. 크레딧은 한 번만 차감돼요."
          : (heading ?? "PRD를 읽고 화면과 동작을 만들고 있어요. 1분 정도 걸려요.")}
      </p>
      <ol className="mt-6 border-t">
        {PREVIEW_STAGES.map((stage, i) => {
          const seen = stages.includes(stage);
          return (
            <li key={stage} className="flex items-center justify-between border-b py-3 text-sm">
              <span className={cn(!seen && "text-muted-foreground")}>
                <span className="mr-3 font-mono text-[11px] text-ink-4">{String(i + 1).padStart(2, "0")}</span>
                {PREVIEW_STAGE_LABELS[stage]}
                {stage !== "script" && " 화면"}
              </span>
              {seen && stage === current ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="만드는 중" />
              ) : seen ? (
                <Check className="size-4" aria-label="완료" />
              ) : (
                <span className="mono-label text-[10px] text-ink-4">대기</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type Screen = { name: string; title: string };
type Device = "desktop" | "mobile";

// 격리된 프레임 안에서 미리보기 앱을 돌린다.
// sandbox 에 allow-same-origin 이 없어 앱 코드는 dot.PRD 의 로그인 정보·화면에 손댈 수 없고,
// 문서 안의 보안 정책(CSP)이 바깥 연결을 막는다. 화면 이름·오류만 postMessage 로 주고받는다.
function PreviewFrame({
  doc,
  kit = null,
  trialKit = null,
}: {
  doc: string;
  // 지금 디자인과 입혀 보는 디자인 (디자인 바꾸기에서만)
  kit?: PreviewKit | null;
  trialKit?: PreviewKit | null;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const shownKit = trialKit ?? kit;
  const shownKitRef = useRef(shownKit);

  // 입혀 보는 디자인이 바뀌면 프레임 안 앱에 알린다 (앱을 다시 불러오지 않고 색·글꼴·모양만 바꾼다)
  const sendKit = useCallback((target: PreviewKit | null) => {
    if (!target) return;
    frame.current?.contentWindow?.postMessage(
      { source: PREVIEW_MESSAGE_FROM_HOST, type: "kit", kit: target, font: PREVIEW_KIT_FONTS[target] },
      "*",
    );
  }, []);
  useEffect(() => {
    shownKitRef.current = shownKit;
    sendKit(shownKit);
  }, [shownKit, sendKit]);
  const [screens, setScreens] = useState<Screen[]>(() => PREVIEW_SCREENS.map((name) => ({ name, title: PREVIEW_SCREEN_LABELS[name] })));
  const [current, setCurrent] = useState("home");
  const [device, setDevice] = useState<Device>("desktop");
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow) return;
      const data = e.data as { source?: string; type?: string; name?: string; screens?: Screen[] } | null;
      if (!data || data.source !== PREVIEW_MESSAGE_FROM_APP) return;
      if (data.type === "ready") {
        if (Array.isArray(data.screens) && data.screens.length) setScreens(data.screens);
        // 앱이 다시 뜨면(예: 새로 만든 문서) 입혀 보던 디자인을 다시 알린다
        sendKit(shownKitRef.current);
      } else if (data.type === "screen" && data.name) setCurrent(data.name);
      else if (data.type === "error") setErrors((n) => n + 1);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendKit]);

  // 필수 화면 네 개를 먼저, AI 가 더 만든 화면은 뒤에
  const main = PREVIEW_SCREENS as readonly string[];
  const ordered = [
    ...main.map((n) => screens.find((s) => s.name === n)).filter((s): s is Screen => !!s),
    ...screens.filter((s) => !main.includes(s.name)),
  ];

  function go(name: string) {
    frame.current?.contentWindow?.postMessage({ source: PREVIEW_MESSAGE_FROM_HOST, type: "go", name }, "*");
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b">
        <div role="tablist" aria-label="화면" className="flex gap-6 overflow-x-auto [scrollbar-width:none] sm:gap-8">
          {ordered.map((s, i) => (
            <button
              key={s.name}
              type="button"
              role="tab"
              aria-selected={current === s.name}
              onClick={() => go(s.name)}
              className={cn(
                "relative flex items-center gap-2.5 whitespace-nowrap pb-[15px] pt-4 text-[14.5px] text-muted-foreground transition-colors hover:text-foreground",
                current === s.name && "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground",
              )}
            >
              <span className="font-mono text-[10.5px]">{String(i + 1).padStart(2, "0")}</span>
              {PREVIEW_SCREEN_LABELS[s.name as keyof typeof PREVIEW_SCREEN_LABELS] ?? s.title ?? s.name}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="화면 크기"
          className="ml-auto hidden shrink-0 rounded-full border border-line-strong bg-background p-[3px] sm:inline-flex"
        >
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={cn(
                "h-7 rounded-full px-3.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
                device === d && "bg-foreground text-background hover:text-background",
              )}
            >
              {d === "desktop" ? "데스크톱" : "휴대폰"}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "mx-auto mt-8 overflow-hidden rounded-[14px] border border-line-strong bg-white transition-[max-width] duration-300",
          device === "mobile" ? "max-w-[392px]" : "max-w-[1180px]",
        )}
      >
        <iframe
          ref={frame}
          title="화면 미리보기"
          srcDoc={doc}
          sandbox="allow-scripts allow-forms"
          className="block h-[640px] w-full border-0 bg-white sm:h-[760px]"
        />
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">
        화면 속 메뉴와 버튼을 눌러 보세요. 위쪽 바로가기로 화면을 옮길 수도 있어요.
        {errors > 0 && " 화면 일부 버튼이 제대로 동작하지 않을 수 있어요."}
      </p>
    </div>
  );
}

// 완성된 미리보기를 HTML 파일로 받아 AI 코딩 도구의 디자인 참고로 쓰는 법
function ReferenceGuide({ doc }: { doc: string }) {
  return (
    <section className="mt-14 grid gap-x-16 gap-y-6 border-t pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="max-w-[520px]">
        <h2 className="break-keep text-[20px] font-semibold tracking-[-0.02em]">이 디자인을 실제 개발에 참고하기</h2>
        <p className="mt-3 break-keep text-[14.5px] leading-relaxed text-muted-foreground">
          HTML 파일을 받아 프로젝트 폴더의 <code className="font-mono text-[13px]">{PREVIEW_FILE_PATH}</code> 로 넣으세요. 브라우저로
          열면 지금처럼 눌러 볼 수 있고, AI 코딩 도구에 아래 한 줄을 함께 주면 화면을 만들 때 이 디자인을 따라가요.
        </p>
        <Button
          className="mt-5"
          onClick={() => downloadBlob("preview.html", new Blob([doc], { type: "text/html;charset=utf-8" }))}
        >
          <Download /> HTML 파일로 받기
        </Button>
      </div>
      <div className="self-start rounded-2xl border p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="mono-label text-muted-foreground">AI 코딩 도구에 붙여 넣기</p>
          <CopyButton text={PREVIEW_REFERENCE_PROMPT} />
        </div>
        <p className="mt-3 break-keep text-[14px] leading-relaxed">{PREVIEW_REFERENCE_PROMPT}</p>
      </div>
    </section>
  );
}
