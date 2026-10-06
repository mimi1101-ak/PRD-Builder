// 환경변수 읽기. 키는 서버 환경변수에만 둔다 (PRD 9장 보안).
// NEXT_PUBLIC_ 으로 시작하는 값만 브라우저에 노출된다.

export class ConfigError extends Error {}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new ConfigError(`환경변수 ${name} 가 설정되지 않았습니다. .env.local 을 확인하세요 (.env.example 참고).`);
  }
  return value;
}

export function supabaseUrl() {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabasePublishableKey() {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// 서버 전용
export function supabaseSecretKey() {
  return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function tossSecretKey() {
  return required("TOSS_SECRET_KEY", process.env.TOSS_SECRET_KEY);
}

export const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || "claude-haiku-4-5";
export const DOC_MODEL = process.env.ANTHROPIC_DOC_MODEL || "claude-opus-5-5";
export const DOC_EFFORT = (process.env.ANTHROPIC_DOC_EFFORT || "low") as "low" | "medium" | "high" | "xhigh" | "max";
