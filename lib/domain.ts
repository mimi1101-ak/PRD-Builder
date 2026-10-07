// 화면·서버가 함께 쓰는 도메인 정의 (docs/PRD.md 4·6·8장)

export const AREA_KEYS = [
  "target_users",
  "problem",
  "features",
  "user_flow",
  "data",
  "auth",
  "payment",
  "integrations",
  "design",
] as const;

export type AreaKey = (typeof AREA_KEYS)[number];

export const AREA_LABELS: Record<AreaKey, string> = {
  target_users: "대상 사용자",
  problem: "핵심 문제",
  features: "핵심 기능",
  user_flow: "사용자 흐름",
  data: "저장할 데이터",
  auth: "로그인·권한",
  payment: "결제",
  integrations: "외부 연동",
  design: "디자인 톤",
};

export type CoverageStatus = "empty" | "partial" | "done";
export type Coverage = Record<AreaKey, CoverageStatus>;

export type IdeaSummary = {
  title: string;
  one_liner: string;
  final_changes: string[];
} & Record<AreaKey, string>;

export type ProjectStatus = "interviewing" | "final_check" | "done";
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  interviewing: "인터뷰 중",
  final_check: "최종 확인 중",
  done: "완료",
};
// 내 프로젝트 보기 방식 (우주 / 목록). 고른 보기는 쿠키에 기억해 새로고침해도 깜빡이지 않게 한다.
export type ProjectsViewMode = "space" | "list";
export const PROJECTS_VIEW_COOKIE = "prd_projects_view";
export type Phase = "interview" | "final_check";
export type DocKind = "prd" | "tasks" | "claude_md";
export type DocStatus = "generating" | "ready" | "failed";

export const DOC_KINDS: DocKind[] = ["prd", "tasks", "claude_md"];

export const DOC_LABELS: Record<DocKind, string> = {
  prd: "PRD",
  tasks: "작업 단계",
  claude_md: "CLAUDE.md",
};

// 내려받을 때의 파일 이름과 zip 안의 위치
export const DOC_FILES: Record<DocKind, { name: string; zipPath: string }> = {
  prd: { name: "PRD.md", zipPath: "docs/PRD.md" },
  tasks: { name: "TASKS.md", zipPath: "docs/TASKS.md" },
  claude_md: { name: "CLAUDE.md", zipPath: "CLAUDE.md" },
};

export const TOOLS = [
  { value: "claude_code", label: "클로드 코드" },
  { value: "cursor", label: "커서" },
  { value: "other", label: "기타 AI 코딩 도구" },
] as const;
export type ToolValue = (typeof TOOLS)[number]["value"];

export const EXPERIENCES = [
  { value: "first", label: "처음이에요" },
  { value: "some", label: "1~3번 만들어 봤어요" },
  { value: "often", label: "자주 만들어요" },
] as const;
export type ExperienceValue = (typeof EXPERIENCES)[number]["value"];

export function toolLabel(value: string | null | undefined) {
  return TOOLS.find((t) => t.value === value)?.label ?? "클로드 코드";
}

export function experienceLabel(value: string | null | undefined) {
  return EXPERIENCES.find((e) => e.value === value)?.label ?? "선택 안 함";
}

// 인터뷰 규칙 (PRD F1)
export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 10;
export const DONT_KNOW_MESSAGE = "잘 모르겠어요. 추천해 주세요.";

// 요금·제한 (PRD 8·9장)
export const FREE_PRD_PER_ACCOUNT = 3; // 무료 PRD 생성: 계정당 3개 (인터뷰는 무제한)
export const REWRITES_PER_CREDIT = 3;
export const MESSAGES_PER_MINUTE = 20;
export const MAX_MESSAGES_PER_PROJECT = 80;
export const MAX_INPUT_LENGTH = 2000;

// 개발자 계정의 다시 쓰기 남은 횟수 (사실상 무제한)
export const UNLIMITED_REWRITES = 9999;
export function rewritesLeftLabel(left: number) {
  return left >= UNLIMITED_REWRITES ? "무제한" : `${left}회 남음`;
}

// 개발자 도구: 한 번에 넣어 줄 수 있는 크레딧 수
export const MAX_GRANT_CREDITS = 100;

export const PRODUCTS = {
  credit_1: { credits: 1, amount: 3900, name: "dot.PRD 크레딧 1건" },
  credit_5: { credits: 5, amount: 14900, name: "dot.PRD 크레딧 5건" },
} as const;
export type ProductKey = keyof typeof PRODUCTS;

export function emptyCoverage(): Coverage {
  return Object.fromEntries(AREA_KEYS.map((k) => [k, "empty"])) as Coverage;
}

export function emptySummary(): IdeaSummary {
  return {
    title: "",
    one_liner: "",
    final_changes: [],
    ...(Object.fromEntries(AREA_KEYS.map((k) => [k, ""])) as Record<AreaKey, string>),
  };
}

// DB의 json 컬럼은 비어 있거나 일부만 있을 수 있어 항상 기본값과 합친다.
export function normalizeCoverage(raw: unknown): Coverage {
  const base = emptyCoverage();
  if (raw && typeof raw === "object") {
    for (const key of AREA_KEYS) {
      const v = (raw as Record<string, unknown>)[key];
      if (v === "empty" || v === "partial" || v === "done") base[key] = v;
    }
  }
  return base;
}

export function normalizeSummary(raw: unknown): IdeaSummary {
  const base = emptySummary();
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (typeof r.title === "string") base.title = r.title;
    if (typeof r.one_liner === "string") base.one_liner = r.one_liner;
    if (Array.isArray(r.final_changes)) {
      base.final_changes = r.final_changes.filter((x): x is string => typeof x === "string");
    }
    for (const key of AREA_KEYS) {
      if (typeof r[key] === "string") base[key] = r[key] as string;
    }
  }
  return base;
}

export function filledAreaCount(coverage: Coverage) {
  return AREA_KEYS.filter((k) => coverage[k] === "done").length;
}

export type ProjectRow = {
  id: string;
  user_id: string | null;
  guest_token: string | null;
  title: string | null;
  idea: string;
  tool: string;
  experience: string | null;
  status: ProjectStatus;
  coverage: unknown;
  summary: unknown;
  unlocked: boolean;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: number;
  project_id: string;
  role: "ai" | "user";
  content: string;
  options: unknown;
  phase: Phase;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  project_id: string;
  kind: DocKind;
  content: string;
  status: DocStatus;
  rewrite_count: number;
  updated_at: string;
};

// 브라우저로 보내는 형태
export type ChatMessage = {
  id: number;
  role: "ai" | "user";
  content: string;
  options: string[];
  phase: Phase;
};

export function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    options: Array.isArray(row.options) ? row.options.filter((x): x is string => typeof x === "string") : [],
    phase: row.phase,
  };
}

export type ProjectView = {
  id: string;
  title: string;
  idea: string;
  tool: string;
  experience: string | null;
  status: ProjectStatus;
  coverage: Coverage;
  summary: IdeaSummary;
  unlocked: boolean;
  createdAt: string;
};

export function toProjectView(row: ProjectRow): ProjectView {
  const summary = normalizeSummary(row.summary);
  return {
    id: row.id,
    title: row.title || summary.title || row.idea.slice(0, 40),
    idea: row.idea,
    tool: row.tool,
    experience: row.experience,
    status: row.status,
    coverage: normalizeCoverage(row.coverage),
    summary,
    unlocked: row.unlocked,
    createdAt: row.created_at,
  };
}

// 인터뷰에서 AI가 이미 물어본 질문 수 = interview 단계의 AI 메시지 수
export function countQuestions(messages: Pick<ChatMessage, "role" | "phase">[]) {
  return messages.filter((m) => m.role === "ai" && m.phase === "interview").length;
}

// AI 가 추천 답변을 본문 끝에 목록으로 또 쓰면 버튼과 겹치므로 잘라 낸다 (스트리밍 중·저장 시 모두 사용).
const LIST_LINE = /^\s*(?:[-*•·]|\d+[.)])\s+/;
export function stripTrailingList(text: string) {
  const lines = text.replace(/\s+$/, "").split("\n");
  let end = lines.length;
  while (end > 0 && (LIST_LINE.test(lines[end - 1]) || !lines[end - 1].trim())) end--;
  // 목록만 있는 메시지라면 그대로 둔다
  if (end === 0 || end === lines.length) return text;
  return lines.slice(0, end).join("\n").trimEnd();
}

// 최종 확인 단계에서 "이대로 PRD 만들기" 버튼과 겹치는 추천 답변인지
const DUPLICATE_OF_BUTTON = /이대로|PRD ?만들|더 ?(이상 )?없|없어요|없습니다|좋아요$/;
export function duplicatesFinalButton(option: string) {
  return DUPLICATE_OF_BUTTON.test(option);
}
