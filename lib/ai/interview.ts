import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, AiError } from "@/lib/ai/client";
import { CHAT_MODEL } from "@/lib/env";
import { fill, promptSection } from "@/lib/prompts";
import {
  AREA_KEYS,
  AREA_LABELS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  duplicatesFinalButton,
  experienceLabel,
  stripTrailingList,
  toolLabel,
  type ChatMessage,
  type Coverage,
  type IdeaSummary,
  type Phase,
  type ProjectStatus,
} from "@/lib/domain";

// ── 도구 정의: 메시지(텍스트)와 함께 받을 구조화 데이터 (PRD 7장 "대화 응답 만들기")

const areaStringProps = Object.fromEntries(AREA_KEYS.map((k) => [k, { type: "string", description: AREA_LABELS[k] }]));
const areaStatusProps = Object.fromEntries(
  AREA_KEYS.map((k) => [k, { type: "string", enum: ["empty", "partial", "done"] }]),
);

const UPDATE_TOOL_BASE = {
  name: "update_interview",
  description:
    "사용자에게 보여줄 메시지를 다 쓴 뒤 정확히 한 번 호출합니다. 지금까지 정리된 아이디어 요약(누적), 9개 영역 상태, 질문 아래 보여줄 추천 답변, 다음 단계를 저장합니다.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "object",
        description: "지금까지의 대화 전체를 영역별로 누적 정리한 요약",
        properties: {
          title: { type: "string", description: "서비스 이름(가칭), 15자 이내" },
          one_liner: { type: "string", description: "한 줄 소개, 40자 이내" },
          ...areaStringProps,
          final_changes: {
            type: "array",
            items: { type: "string" },
            description: "최종 확인에서 받은 추가·수정 사항 목록",
          },
        },
        required: ["title", "one_liner", ...AREA_KEYS, "final_changes"],
      },
      coverage: {
        type: "object",
        description: "9개 영역별 상태",
        properties: areaStatusProps,
        required: [...AREA_KEYS],
      },
      options: {
        type: "array",
        items: { type: "string" },
        maxItems: 3,
        description: "질문 아래 버튼으로 보여줄 추천 답변 (각 25자 이내)",
      },
      phase: { type: "string", enum: ["interview", "final_check"] },
    },
    required: ["summary", "coverage", "options", "phase"],
  },
} satisfies Anthropic.Tool;

// 스트리밍 요청에서는 도구 입력도 바로바로 흘려보내게 한다(검증은 아래 zod 로 직접).
const UPDATE_TOOL_STREAMING: Anthropic.Tool = { ...UPDATE_TOOL_BASE, eager_input_streaming: true };

const coverageEnum = z.enum(["empty", "partial", "done"]);
const UpdateSchema = z.object({
  summary: z.object({
    title: z.string(),
    one_liner: z.string(),
    target_users: z.string(),
    problem: z.string(),
    features: z.string(),
    user_flow: z.string(),
    data: z.string(),
    auth: z.string(),
    payment: z.string(),
    integrations: z.string(),
    design: z.string(),
    final_changes: z.array(z.string()),
  }),
  coverage: z.object({
    target_users: coverageEnum,
    problem: coverageEnum,
    features: coverageEnum,
    user_flow: coverageEnum,
    data: coverageEnum,
    auth: coverageEnum,
    payment: coverageEnum,
    integrations: coverageEnum,
    design: coverageEnum,
  }),
  options: z.array(z.string()),
  phase: z.enum(["interview", "final_check"]),
});
type InterviewUpdate = z.infer<typeof UpdateSchema>;

// ── 이번 턴의 단계 규칙 (PRD: 5문항 전 완성 금지, 10문항째 무조건 final_check)

type TurnRule = "must_ask" | "may_finish" | "must_finish" | "final_check";

export function turnRuleFor(status: ProjectStatus, questionCount: number): TurnRule {
  if (status === "final_check" || status === "done") return "final_check";
  if (questionCount >= MAX_QUESTIONS) return "must_finish";
  if (questionCount < MIN_QUESTIONS) return "must_ask";
  return "may_finish";
}

function enforcePhase(rule: TurnRule, modelPhase: Phase | undefined): Phase {
  switch (rule) {
    case "must_ask":
      return "interview";
    case "must_finish":
    case "final_check":
      return "final_check";
    case "may_finish":
      return modelPhase ?? "interview";
  }
}

function buildSystem(input: TurnInput, rule: TurnRule): Anthropic.TextBlockParam[] {
  const vars = {
    tool: toolLabel(input.tool),
    experience: experienceLabel(input.experience),
    min_questions: MIN_QUESTIONS,
    max_questions: MAX_QUESTIONS,
  };
  let ruleText = fill(promptSection("interview.md", `rule_${rule}`), vars);
  if (rule === "may_finish" || rule === "must_finish") {
    ruleText += "\n\n" + promptSection("interview.md", "final_check_format");
  }
  const state = fill(promptSection("interview.md", "state"), {
    ...vars,
    phase: input.status === "interviewing" ? "interview (질문 중)" : "final_check (최종 확인 중)",
    question_count: input.questionCount,
    coverage: AREA_KEYS.map((k) => `${AREA_LABELS[k]}(${k})=${input.coverage[k]}`).join(", "),
    summary: JSON.stringify(input.summary),
    turn_rule: ruleText,
  });
  return [
    { type: "text", text: fill(promptSection("interview.md", "system"), vars) },
    { type: "text", text: state },
  ];
}

function toApiMessages(history: ChatMessage[]): Anthropic.MessageParam[] {
  return history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));
}

function findUpdate(content: Anthropic.ContentBlock[]): InterviewUpdate | null {
  const block = content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === UPDATE_TOOL_BASE.name,
  );
  if (!block) return null;
  const parsed = UpdateSchema.safeParse(block.input);
  return parsed.success ? parsed.data : null;
}

// ── 공개 함수

export type TurnInput = {
  tool: string;
  experience: string | null;
  status: ProjectStatus;
  questionCount: number;
  coverage: Coverage;
  summary: IdeaSummary;
  history: ChatMessage[]; // 마지막은 반드시 사용자 메시지
};

export type TurnResult = {
  text: string;
  phase: Phase;
  options: string[];
  coverage: Coverage;
  summary: IdeaSummary;
};

export async function runInterviewTurn(
  input: TurnInput,
  onText: (delta: string) => void,
  signal?: AbortSignal,
): Promise<TurnResult> {
  const rule = turnRuleFor(input.status, input.questionCount);
  const system = buildSystem(input, rule);
  const messages = toApiMessages(input.history);

  const stream = anthropic().messages.stream(
    {
      model: CHAT_MODEL,
      max_tokens: 4096,
      system,
      messages,
      tools: [UPDATE_TOOL_STREAMING],
      tool_choice: { type: "auto" },
    },
    { signal },
  );
  stream.on("text", (delta) => onText(delta));
  const final = await stream.finalMessage();

  if (final.stop_reason === "refusal") {
    throw new AiError("이 내용으로는 답변을 만들 수 없어요. 표현을 바꿔 다시 말씀해 주세요.", false);
  }

  const text = stripTrailingList(
    final.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim(),
  );
  if (!text) throw new AiError("AI 응답이 비어 있어요. 다시 시도해 주세요.");

  // 잘린 응답(max_tokens)의 도구 입력은 믿지 않는다.
  let update = final.stop_reason === "max_tokens" ? null : findUpdate(final.content);
  if (!update) update = await extractUpdate(system, messages, text, signal);

  return mergeResult(input, rule, text, update);
}

// 모델이 도구를 빠뜨렸거나 형식이 틀렸을 때: 방금 쓴 메시지를 기준으로 상태만 다시 받는다.
async function extractUpdate(
  system: Anthropic.TextBlockParam[],
  messages: Anthropic.MessageParam[],
  text: string,
  signal?: AbortSignal,
): Promise<InterviewUpdate | null> {
  try {
    const res = await anthropic().messages.create(
      {
        model: CHAT_MODEL,
        max_tokens: 2048,
        system,
        messages: [
          ...messages,
          { role: "assistant", content: text },
          { role: "user", content: promptSection("interview.md", "extract") },
        ],
        tools: [UPDATE_TOOL_BASE],
        tool_choice: { type: "auto" },
      },
      { signal },
    );
    return res.stop_reason === "max_tokens" ? null : findUpdate(res.content);
  } catch (err) {
    if (signal?.aborted) throw err;
    console.error("[interview] extract failed", err);
    return null;
  }
}

// 화면에 따로 있는 버튼("잘 모르겠어요", "이대로 PRD 만들기")과 겹치는 추천 답변은 뺀다.
function cleanOptions(options: string[], phase: Phase) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of options) {
    const option = raw.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!option || seen.has(option) || /잘 ?모르겠/.test(option)) continue;
    if (phase === "final_check" && duplicatesFinalButton(option)) continue;
    seen.add(option);
    out.push(option);
    if (out.length === 3) break;
  }
  return out;
}

function mergeResult(input: TurnInput, rule: TurnRule, text: string, update: InterviewUpdate | null): TurnResult {
  const phase = enforcePhase(rule, update?.phase);
  if (!update) {
    // 상태를 못 받아도 대화는 이어지게, 이전 요약을 그대로 둔다.
    return { text, phase, options: [], coverage: input.coverage, summary: input.summary };
  }

  const summary: IdeaSummary = { ...input.summary };
  // 모델이 실수로 비워 보낸 칸은 이전 값을 유지한다 (요약은 누적).
  for (const key of ["title", "one_liner", ...AREA_KEYS] as const) {
    const next = update.summary[key].trim();
    if (next) summary[key] = next;
  }
  const changes = [...input.summary.final_changes];
  for (const c of update.summary.final_changes) {
    const v = c.trim();
    if (v && !changes.includes(v)) changes.push(v);
  }
  summary.final_changes = changes;

  const coverage: Coverage = { ...input.coverage };
  for (const key of AREA_KEYS) {
    const next = update.coverage[key];
    // 이미 done 인 영역이 근거 없이 empty 로 돌아가지 않게 한다.
    if (input.coverage[key] === "done" && next === "empty") continue;
    coverage[key] = next;
  }

  return { text, phase, options: cleanOptions(update.options, phase), coverage, summary };
}
