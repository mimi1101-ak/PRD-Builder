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

// 결과 화면의 진행 방식. 문서(PRD·TASKS·CLAUDE.md)는 같고, 원샷은 자동 완성 프롬프트 하나로 TASKS.md를 끝까지 진행한다.
// 잠금 해제(크레딧 1건)하면 두 방식 모두 쓸 수 있다.
export type BuildMode = "step" | "oneshot";
export const BUILD_MODES: BuildMode[] = ["step", "oneshot"];
export const BUILD_MODE_LABELS: Record<BuildMode, string> = { step: "단계별", oneshot: "원샷" };
export const BUILD_MODE_DESCRIPTIONS: Record<BuildMode, string> = {
  step: "한 단계씩 붙여 넣고 확인하며 만들어요",
  oneshot: "프롬프트 한 번으로 AI가 끝까지 만들어요",
};

// 원샷 모드에서 붙여 넣는 프롬프트. CLAUDE.md·TASKS.md 의 "확인받기" 지시를 이번 실행에서만 풀어 준다.
// 규칙을 docs/AUTO_MODE.md 에 저장하게 해서 대화가 길어져 앞부분이 요약돼도 유지되게 한다.
export const ONE_SHOT_PROMPT = `docs/PRD.md, docs/TASKS.md, CLAUDE.md를 읽어. 이번엔 '자동 완성 모드'로 진행해.

## 0. 시작 전에
- 이 메시지의 규칙을 docs/AUTO_MODE.md에 그대로 저장해. 그리고 CLAUDE.md 맨 위에 아래 한 줄을 추가해.
  > 지금은 자동 완성 모드다. docs/AUTO_MODE.md의 규칙이 이 파일과 docs/TASKS.md의 작업 규칙보다 우선한다.
  (대화가 길어져도 규칙이 유지되게 하려는 것)
- PRD 기술 스택에 Supabase가 있으면 Supabase MCP가 연결돼 있는지 확인해. 연결이 안 돼 있으면 아무것도 시작하지 말고 바로 알려 줘.

## 1. 우선순위
- docs/AUTO_MODE.md > CLAUDE.md > docs/TASKS.md 순서로 따른다. 단, 폴더 경로는 3번 규칙을 따른다.
- 단계마다 확인받지 말고 TASKS 순서대로 마지막 단계까지 진행해. 문서에 있는 지시는 이렇게 바꿔서 처리해.
  - "먼저 물어봐", "확인받기" → 2번 규칙대로 직접 정하고 docs/DECISIONS.md에 적기
  - "계획부터 설명해" → 생략 (대신 6번 규칙대로 진행 기록 남기기)
  - "~를 안내해 줘" (대시보드·외부 콘솔 설정, 계정 만들기처럼 내가 직접 해야 하는 일) → docs/REPORT.md의 "사용자가 할 일"에 모으기
- 각 단계의 "하지 말 것"은 계속 지켜. 다음 단계 일을 미리 하지 마.

## 2. 미결 사항 정하기
- PRD 9장 미결 사항과 TASKS가 물어보라고 한 것은 가장 단순하고 무료인 선택지로 정해. 무료가 없으면 가장 저렴한 것으로.
- docs/DECISIONS.md에 "질문 / 고른 답 / 이유 / 나중에 바꾸려면 고칠 곳" 형식으로 적어.

## 3. 1단계(프로젝트 생성) 특별 규칙
- CLAUDE.md는 이미 있어. 새로 만들거나 덮어쓰지 마. TASKS 1단계에 CLAUDE.md를 만들라는 지시가 있어도 건너뛰어.
- 생성 명령이 "폴더가 비어 있지 않다"며 막히면 CLAUDE.md와 docs/를 잠시 옮겼다가 생성 후 되돌려. 생성 과정에서 CLAUDE.md나 AGENTS.md가 새로 생겼다면 원래 CLAUDE.md로 되돌려. 마지막에 CLAUDE.md 내용이 원래와 같은지 확인해.
- CLAUDE.md와 TASKS.md의 폴더 경로가 다르면(예: src/ 사용 여부) TASKS.md를 기준으로 하고, CLAUDE.md의 "폴더 구조" 부분만 그에 맞게 고쳐. 바꾼 내용은 DECISIONS.md에 적어.

## 4. DB (Supabase를 쓰는 경우)
- DB는 Supabase MCP로 만들어. 대시보드 안내, SQL Editor 붙여넣기, supabase db push는 쓰지 마.
- 사용할 Supabase 프로젝트: 이 폴더 이름과 같은 이름의 프로젝트가 있으면 그걸 쓰고, 없으면 무료 플랜으로 새로 만들어. 비용이 0원이 아니면 만들지 마.
- 사용하기로 한 프로젝트 말고 다른 Supabase 프로젝트는 읽지도 바꾸지도 마.
- 마이그레이션은 SQL 파일을 supabase/migrations에 먼저 쓰고, 같은 내용을 MCP로 적용해. 파일과 실제 DB가 항상 같아야 해.
- 테이블을 만들거나 바꾼 단계마다 Supabase 보안 점검으로 RLS가 빠진 테이블이 없는지 확인하고 고쳐.
- 프로젝트 URL과 공개 키(anon/publishable)는 MCP로 가져와서 .env.local에 넣어.

## 5. API 키
- 직접 만들 수 있는 키는 직접 만들어서 .env.local에 넣어. (예: 웹 푸시 VAPID 키, 내부용 비밀 문자열)
- 외부 서비스 가입이 필요하거나 MCP로 가져올 수 없는 키(예: 결제 테스트 키, 소셜 로그인 키, 문자 발송 키, Supabase service role 키)는 가짜 값이나 가짜 동작으로 대신하지 마. 코드는 실제 연동 기준으로 완성하고, .env.example에 이름만 적고, REPORT.md의 "키 필요"에 올려.
- 키가 없어도 npm run build는 통과해야 해. 키는 파일 맨 위가 아니라 실제로 쓰는 함수 안에서 읽고, 키가 없으면 "○○ 키가 필요합니다" 에러를 내게 해.
- TASKS에 있는 "가짜 데이터로 화면 뼈대 만들기"는 계획대로 해도 돼. 이건 외부 연동을 흉내 내는 게 아니야. 다만 DB를 연결하는 단계에서 실제 데이터로 바꾸고, 끝났을 때 가짜 데이터가 남아 있으면 안 돼.

## 6. 단계마다
- npm run build와 npm run lint를 돌리고, 통과할 때까지 직접 고쳐.
- 같은 에러를 3번 고쳐도 안 되면 REPORT.md "막힌 것"에 적고 넘어가. 다음 단계가 그 부분에 의존하면, 의존하지 않는 단계부터 해.
- 통과하면 git commit 해. (메시지: "N단계: 단계 제목")
- docs/PROGRESS.md에 "N단계 완료 / 한 일 한 줄 / 남은 문제"를 적어. 대화가 끊기면 이 파일을 보고 이어서 해.
- TASKS의 "완료 확인" 중 직접 할 수 있는 것(빌드, API 호출 테스트 등)은 해. 브라우저에서 눌러봐야 하는 것은 REPORT.md "직접 확인할 것"에 모아.

## 7. 배포 단계
- GitHub 업로드나 Vercel 배포처럼 계정이 필요한 일은 하지 마. 배포 전 점검(빌드 통과, .env.local이 git에 안 올라가는지)까지만 하고, 배포 방법은 REPORT.md "사용자가 할 일"에 적어.

## 8. 예외적으로 멈추는 경우
- 돈이 드는 선택, 이 프로젝트 폴더 밖의 파일 변경(1단계의 임시 이동은 예외), 다른 Supabase 프로젝트 접근, 이미 있는 데이터 삭제.
- 이런 경우엔 그 작업만 하지 말고 REPORT.md에 적은 뒤, 상관없는 단계는 계속 진행해. 모든 단계가 막히면 그때 멈추고 알려 줘.

## 9. 끝나면
- CLAUDE.md 맨 위에 추가했던 자동 완성 모드 한 줄을 지워.
- docs/REPORT.md를 아래 구성으로 쓰고, 채팅으로도 짧게 요약해 줘.
  1. 완료한 단계 / 못 한 단계
  2. 정한 미결 사항 요약 (자세한 건 DECISIONS.md)
  3. 키 필요: 키 이름 / 받는 곳 / 무료·유료 / 넣을 곳(.env.local, Supabase 대시보드 등)
  4. 사용자가 할 일: 순서대로 (예: 관리자 계정 지정, 소셜 로그인 콘솔 설정, 배포)
  5. 직접 확인할 것: 어떤 화면에서 무엇을 누르면 어떤 결과가 나와야 하는지
  6. 막힌 것과 남은 에러`;

// 원샷 모드 아래 "이렇게 넣으세요" 가이드의 짧은 프롬프트. 사용자가 준 원문에서 말투만 다듬었다.
export const ONE_SHOT_SHORT_PROMPT = `docs/PRD.md 파일을 보고 Supabase MCP로 DB를 만든 다음, 앱을 완성해 줘.
오류가 있으면 스스로 검토해서 고치면서 진행하고, 문서를 기준으로 만들어 줘.`;

// Supabase 가 안내하는 MCP 서버 주소 (OAuth 로그인으로 연결)
export const SUPABASE_MCP_URL = "https://mcp.supabase.com/mcp";

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

// 문장 안에 넣을 도구 이름 ("기타"는 문장에 어울리게)
export function toolName(value: string | null | undefined) {
  return value === "other" ? "AI 코딩 도구" : toolLabel(value);
}

// 진행 중인 AI 를 멈추는 방법
export function toolStopHint(value: string | null | undefined) {
  if (value === "cursor") return "정지 버튼을 누르면 멈춰요.";
  if (value === "other") return "도구의 정지 버튼을 누르면 멈춰요.";
  return "Esc를 누르면 멈춰요.";
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
