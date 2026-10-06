import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, AiError, supportsEffort, supportsServerFallback } from "@/lib/ai/client";
import { DOC_EFFORT, DOC_MODEL } from "@/lib/env";
import { fill, promptSection } from "@/lib/prompts";
import { stripOuterFence } from "@/lib/markdown";
import {
  AREA_KEYS,
  AREA_LABELS,
  DOC_LABELS,
  experienceLabel,
  toolLabel,
  type ChatMessage,
  type Coverage,
  type DocKind,
  type IdeaSummary,
} from "@/lib/domain";

export type DocContextInput = {
  idea: string;
  tool: string;
  experience: string | null;
  coverage: Coverage;
  summary: IdeaSummary;
  messages: ChatMessage[];
};

// 문서 3종이 함께 쓰는 자료 묶음 (프롬프트 캐시가 걸리도록 매번 똑같이 만든다)
function buildContext(input: DocContextInput) {
  const { summary, coverage } = input;
  const unanswered = AREA_KEYS.filter((k) => coverage[k] === "empty" || !summary[k].trim()).map((k) => AREA_LABELS[k]);
  const summaryLines = AREA_KEYS.map(
    (k) =>
      `- ${AREA_LABELS[k]}: ${summary[k].trim() || "(답 없음)"}${coverage[k] === "partial" ? " (일부만 확인됨)" : ""}`,
  ).join("\n");
  const transcript = input.messages
    .map((m) => {
      const who = m.role === "user" ? "사용자" : "기획자";
      const tag = m.phase === "final_check" ? " [최종 확인]" : "";
      return `${who}${tag}: ${m.content.trim()}`;
    })
    .join("\n\n");

  return fill(promptSection("documents.md", "context"), {
    title: summary.title || "(미정)",
    one_liner: summary.one_liner || "(미정)",
    idea: input.idea,
    tool: toolLabel(input.tool),
    experience: experienceLabel(input.experience),
    summary_lines: summaryLines,
    unanswered: unanswered.length ? unanswered.join(", ") : "없음",
    final_changes: summary.final_changes.length ? summary.final_changes.map((c) => `- ${c}`).join("\n") : "- 없음",
    transcript,
  });
}

async function streamMarkdown(
  userContent: Anthropic.Beta.BetaContentBlockParam[],
  onText: (delta: string) => void,
  minLength: number,
): Promise<string> {
  // 브라우저가 연결을 끊어도 생성은 끝까지 마치고 저장한다(비용 낭비 방지). 그래서 abort signal 을 넘기지 않는다.
  const stream = anthropic().beta.messages.stream({
    model: DOC_MODEL,
    max_tokens: 64000,
    system: promptSection("documents.md", "system"),
    messages: [{ role: "user", content: userContent }],
    ...(supportsEffort(DOC_MODEL) ? { output_config: { effort: DOC_EFFORT } } : {}),
    // 안전 분류기가 거절하면 서버에서 추천 모델로 자동 재시도
    ...(supportsServerFallback(DOC_MODEL)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  });
  stream.on("text", (delta) => onText(delta));
  const final = await stream.finalMessage();

  if (final.stop_reason === "refusal") {
    throw new AiError("이 아이디어로는 문서를 만들 수 없어요. 내용을 조금 바꿔 다시 시도해 주세요.", false);
  }
  if (final.stop_reason === "max_tokens") {
    throw new AiError("문서가 너무 길어 중간에 끊겼어요. 다시 시도해 주세요.");
  }
  const text = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const markdown = stripOuterFence(text);
  if (markdown.length < minLength) throw new AiError("내용이 너무 짧게 나왔어요. 다시 시도해 주세요.");
  return markdown;
}

export async function generateDocument(
  kind: DocKind,
  input: DocContextInput & { prd?: string },
  onText: (delta: string) => void,
) {
  const instruction = fill(promptSection("documents.md", kind), {
    tool: toolLabel(input.tool),
    prd: input.prd ?? "",
  });
  return streamMarkdown(
    [
      // 세 문서가 공통으로 쓰는 앞부분은 캐시해 두 번째 문서부터 비용을 줄인다.
      { type: "text", text: buildContext(input), cache_control: { type: "ephemeral" } },
      { type: "text", text: instruction },
    ],
    onText,
    300,
  );
}

export async function rewriteSection(
  kind: DocKind,
  input: DocContextInput & { document: string; section: string; heading: string; instruction: string },
  onText: (delta: string) => void,
) {
  const request = fill(promptSection("documents.md", "rewrite"), {
    doc_label: DOC_LABELS[kind],
    document: input.document,
    section: input.section,
    heading: input.heading,
    instruction: input.instruction.trim() || "(요청 없음 — 더 구체적이고 실행하기 쉽게 다듬어 주세요)",
  });
  return streamMarkdown(
    [
      { type: "text", text: buildContext(input), cache_control: { type: "ephemeral" } },
      { type: "text", text: request },
    ],
    onText,
    10,
  );
}
