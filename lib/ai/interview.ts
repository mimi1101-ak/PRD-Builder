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

// ── 도구 정의: 사용자에게 보여줄 메시지와 구조화 데이터를 도구 하나로 받는다 (PRD 7장 "대화 응답 만들기")
// 도구 호출을 강제해 상태가 빠지는 일을 막는다. message 를 맨 앞, options 를 그다음에 두어 글이 먼저 흘러나오게 한다.

const areaStringProps = Object.fromEntries(AREA_KEYS.map((k) => [k, { type: "string", description: AREA_LABELS[k] }]));
const areaStatusProps = Object.fromEntries(
  AREA_KEYS.map((k) => [k, { type: "string", enum: ["empty", "partial", "done"] }]),
);

const UPDATE_TOOL_BASE = {
  name: "update_interview",
  description:
    "사용자에게 보여줄 메시지와 정리된 상태(추천 답변, 다음 단계, 9개 영역 상태, 누적 요약)를 한 번에 저장합니다. message 를 가장 먼저 씁니다.",
  input_schema: {
    type: "object" as const,
    properties: {
      message: { type: "string", description: "사용자에게 보여줄 메시지 (답 받기 문단, 빈 줄, 질문 문단)" },
      options: {
        type: "array",
        items: { type: "string" },
        maxItems: 3,
        description: "질문 아래 버튼으로 보여줄 추천 답변 (각 25자 이내)",
      },
      phase: { type: "string", enum: ["interview", "final_check"] },
      coverage: {
        type: "object",
        description: "9개 영역별 상태",
        properties: areaStatusProps,
        required: [...AREA_KEYS],
      },
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
    },
    required: ["message", "options", "phase", "coverage", "summary"],
  },
} satisfies Anthropic.Tool;

// 스트리밍 요청에서는 도구 입력도 바로바로 흘려보내게 한다(검증은 아래 zod 로 직접).
const UPDATE_TOOL_STREAMING: Anthropic.Tool = { ...UPDATE_TOOL_BASE, eager_input_streaming: true };

const coverageEnum = z.enum(["empty", "partial", "done"]);
const UpdateSchema = z.object({
  message: z.string(),
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
    // 인터뷰 중에는 모델이 이 칸을 아예 빼고 보내는 일이 잦다 (eager_input_streaming 은 서버가 검사하지 않음)
    final_changes: z.array(z.string()).default([]),
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

type TurnRule = "must_ask" | "keep_asking" | "may_finish" | "must_finish" | "final_check";

// 아직 done 이 아닌 영역
function openAreas(coverage: Coverage) {
  return AREA_KEYS.filter((k) => coverage[k] !== "done");
}

export function turnRuleFor(status: ProjectStatus, questionCount: number, coverage: Coverage): TurnRule {
  if (status === "final_check" || status === "done") return "final_check";
  if (questionCount >= MAX_QUESTIONS) return "must_finish";
  if (questionCount < MIN_QUESTIONS) return "must_ask";
  // 덜 찬 영역이 둘 이상이면 마칠 수 없다. 모델에게 맡기면 남은 영역을 한꺼번에 done 으로 바꾸고 일찍 끝내곤 한다.
  // 하나까지는 허용한다: 방금 받은 답으로 마지막 영역이 채워질 수 있다.
  if (openAreas(coverage).length > 1) return "keep_asking";
  return "may_finish";
}

function enforcePhase(rule: TurnRule, modelPhase: Phase | undefined): Phase {
  switch (rule) {
    case "must_ask":
    case "keep_asking":
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
    open_areas: openAreas(input.coverage)
      .map((k) => AREA_LABELS[k])
      .join(", "),
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

export type TurnHandlers = {
  onText: (delta: string) => void;
  // 질문 단계(interview)에서 추천 답변이 완성되면, 요약을 다 쓰기 전에 먼저 알린다 (한 번만).
  onOptions?: (options: string[]) => void;
};

export async function runInterviewTurn(
  input: TurnInput,
  handlers: TurnHandlers,
  signal?: AbortSignal,
): Promise<TurnResult> {
  const rule = turnRuleFor(input.status, input.questionCount, input.coverage);
  const system = buildSystem(input, rule);
  const messages = toApiMessages(input.history);

  const stream = anthropic().messages.stream(
    {
      model: CHAT_MODEL,
      max_tokens: 4096,
      system,
      messages,
      tools: [UPDATE_TOOL_STREAMING],
      // 도구 호출 강제: claude-haiku-4-5 는 된다. Opus 5.5·Sonnet 5.5·Fable 5.1 은 tool_choice any/tool 을 400 으로
      // 거절하므로, 대화 모델을 그쪽으로 바꾸면 이 방식도 함께 바꿔야 한다.
      tool_choice: { type: "tool", name: UPDATE_TOOL_BASE.name },
    },
    { signal },
  );
  // 도구 입력(JSON) 조각에서 message 를 꺼내, 새로 늘어난 글자만 화면으로 보낸다.
  let json = "";
  let shown = "";
  let optionsSent = false;
  stream.on("streamEvent", (event) => {
    if (event.type !== "content_block_delta" || event.delta.type !== "input_json_delta") return;
    json += event.delta.partial_json;
    const message = partialStringField(json, "message");
    if (message.length > shown.length && message.startsWith(shown)) {
      handlers.onText(message.slice(shown.length));
      shown = message;
    }
    if (!optionsSent && handlers.onOptions) {
      const early = earlyOptions(json, rule);
      if (early) {
        optionsSent = true;
        // 최종 확인으로 넘어가는 턴은 저장된 상태가 있어야 "이대로 PRD 만들기"가 동작하므로 끝까지 기다린다.
        if (early.phase === "interview") handlers.onOptions(early.options);
      }
    }
  });
  const final = await stream.finalMessage();

  if (final.stop_reason === "refusal") {
    throw new AiError("이 내용으로는 답변을 만들 수 없어요. 표현을 바꿔 다시 말씀해 주세요.", false);
  }

  // 잘린 응답(max_tokens)의 도구 입력은 믿지 않는다. 상태를 못 받아도 흘려보낸 메시지로 대화는 이어 간다.
  const update = final.stop_reason === "max_tokens" ? null : findUpdate(final.content);
  if (!update) console.error("[interview] update_interview 입력을 읽지 못함", final.stop_reason);

  const text = stripTrailingList((update?.message ?? shown).trim());
  if (!text) throw new AiError("AI 응답이 비어 있어요. 다시 시도해 주세요.");

  return mergeResult(input, rule, text, update);
}

// options 배열과 phase 가 다 들어왔으면(요약보다 먼저 온다) 마지막에 저장될 것과 같은 버튼 목록을 돌려준다.
function earlyOptions(json: string, rule: TurnRule): { options: string[]; phase: Phase } | null {
  const options = json.match(/"options"\s*:\s*(\[[^\]]*\])/);
  const phase = json.match(/"phase"\s*:\s*"(interview|final_check)"/);
  if (!options || !phase) return null;
  try {
    const list = z.array(z.string()).parse(JSON.parse(options[1]));
    const enforced = enforcePhase(rule, phase[1] as Phase);
    return { options: cleanOptions(list, enforced), phase: enforced };
  } catch {
    return null;
  }
}

// 스트리밍 중인 JSON 조각에서 문자열 필드 하나를 지금까지 온 만큼 꺼낸다 (아직 안 왔으면 "").
function partialStringField(json: string, key: string): string {
  const start = json.match(new RegExp(`"${key}"\\s*:\\s*"`));
  if (!start || start.index === undefined) return "";
  let body = json.slice(start.index + start[0].length);
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "\\") i++;
    else if (body[i] === '"') {
      body = body.slice(0, i);
      break;
    }
  }
  // 끝에 덜 온 이스케이프(\ 또는 \u12)는 다음 조각을 기다린다
  body = body.replace(/\\u[0-9a-fA-F]{0,3}$/, "");
  if ((body.match(/\\+$/)?.[0].length ?? 0) % 2 === 1) body = body.slice(0, -1);
  try {
    return JSON.parse(`"${body}"`) as string;
  } catch {
    return "";
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
