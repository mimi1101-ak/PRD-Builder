import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, AiError, supportsEffort, supportsServerFallback } from "@/lib/ai/client";
import { DOC_EFFORT, DOC_MODEL } from "@/lib/env";
import { fill, promptSection } from "@/lib/prompts";
import { splitKitHeader } from "@/lib/preview-doc";
import { PREVIEW_SCREENS, PREVIEW_STAGES, type PreviewContent, type PreviewStage } from "@/lib/preview";
import type { IdeaSummary } from "@/lib/domain";

export type PreviewInput = { summary: IdeaSummary; prd: string };

// 화면에 나오면 안 되는 문구 (프롬프트로 막지만 한 번 더 기록해 둔다)
const BANNED_WORDS = [
  "혁신",
  "새로운 기준",
  "스마트한",
  "손쉽게",
  "간편하게",
  "한눈에",
  "올인원",
  "지금 바로",
  "시작해 보세요",
  "경험해 보세요",
  "여정",
  "놀라운",
  "완벽한",
  "최고의",
  "강력한",
  "차별화된",
  "극대화",
  "맞춤형",
  "AI 기반",
];

// 꼭 지켜야 하는 것: 빠지면 같은 요청 안에서 한 번 다시 만든다
function hardIssues(html: string) {
  const issues: string[] = [];
  for (const s of PREVIEW_SCREENS) if (!html.includes(`data-screen="${s}"`)) issues.push(`화면 없음: ${s}`);
  if (!/<script[\s>]/i.test(html)) issues.push("스크립트 없음");
  const api = html.match(
    /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|window\.open\s*\(|\blocation\s*(?:\.\s*(?:href|assign|replace)\b|=)|\beval\s*\(|new\s+Function\s*\(/,
  );
  if (api) issues.push(`쓰면 안 되는 기능: ${api[0]}`);
  return issues;
}

// 고쳐서 쓸 수 있는 것: 문서 구조를 흔드는 태그를 빼고, style 속성의 그라데이션·글꼴·외부 그림을 지운다.
// (어차피 격리된 프레임과 보안 정책 안에서 돌지만, 디자인 원칙과 안전을 한 번 더 지킨다)
function sanitize(html: string) {
  return html
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "")
    .replace(/<(?:meta|link|base)\b[^>]*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<(iframe|object|embed)\b[\s\S]*?(?:<\/\1>|\/?>)/gi, "")
    .replace(/\sstyle="([^"]*)"/gi, (_, css: string) => {
      const kept = css
        .split(";")
        .filter((d) => d.trim() && !/gradient|url\s*\(|font-family|@import/i.test(d))
        .join(";");
      return kept ? ` style="${kept}"` : "";
    });
}

async function requestOnce(request: string, onStage: (stage: PreviewStage) => void) {
  // 브라우저가 연결을 끊어도 생성은 끝까지 마치고 저장한다 (문서 생성과 같은 이유)
  const stream = anthropic().beta.messages.stream({
    model: DOC_MODEL,
    max_tokens: 32000,
    system: promptSection("preview.md", "system"),
    messages: [{ role: "user", content: request }],
    ...(supportsEffort(DOC_MODEL) ? { output_config: { effort: DOC_EFFORT } } : {}),
    // 안전 분류기가 거절하면 서버에서 추천 모델로 자동 재시도
    ...(supportsServerFallback(DOC_MODEL)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  });

  let text = "";
  const seen = new Set<PreviewStage>();
  stream.on("text", (delta) => {
    text += delta;
    for (const stage of PREVIEW_STAGES) {
      if (seen.has(stage)) continue;
      const marker = stage === "script" ? "<script" : `data-screen="${stage}"`;
      if (text.includes(marker)) {
        seen.add(stage);
        onStage(stage);
      }
    }
  });
  const final = await stream.finalMessage();

  if (final.stop_reason === "refusal") {
    throw new AiError("이 아이디어로는 미리보기를 만들 수 없어요. 내용을 조금 바꿔 다시 시도해 주세요.", false);
  }
  if (final.stop_reason === "max_tokens") {
    throw new AiError("미리보기가 너무 길어 중간에 끊겼어요. 다시 시도해 주세요.");
  }
  // 코드 블록(```html)으로 감싸 와도 읽히게
  return final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^```(?:html)?\s*\n/, "")
    .replace(/\n```\s*$/, "");
}

// 화면 미리보기 웹앱 만들기. onStage 는 각 화면·스크립트를 쓰기 시작할 때 한 번씩 불린다.
export async function generatePreview(
  input: PreviewInput,
  onStage: (stage: PreviewStage) => void,
  onRestart: () => void,
): Promise<PreviewContent> {
  const { summary } = input;
  const request = fill(promptSection("preview.md", "request"), {
    title: summary.title || "(미정)",
    one_liner: summary.one_liner || "(미정)",
    design: summary.design.trim() || "(답 없음)",
    payment: summary.payment.trim() || "(답 없음)",
    prd: input.prd,
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) onRestart();
    const { kit, accent, html } = splitKitHeader(await requestOnce(request, onStage));
    const issues = hardIssues(html);
    if (issues.length) {
      console.warn("[preview] check failed", attempt, issues);
      continue;
    }
    const words = BANNED_WORDS.filter((w) => html.includes(w));
    if (words.length) console.warn("[preview] banned words", words);
    return { version: 2, kit, accent, html: sanitize(html) };
  }
  throw new AiError("미리보기를 제대로 만들지 못했어요. 다시 시도해 주세요.");
}
