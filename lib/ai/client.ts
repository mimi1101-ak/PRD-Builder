import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ConfigError } from "@/lib/env";

let client: Anthropic | null = null;

// ANTHROPIC_API_KEY 는 서버 환경변수에서만 읽는다.
// 실패하면 SDK 가 자동으로 1회 재시도한다 (PRD 9장 오류 처리).
export function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new ConfigError("환경변수 ANTHROPIC_API_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요 (.env.example 참고).");
  }
  if (!client) client = new Anthropic({ maxRetries: 1 });
  return client;
}

// 모델별로 지원하는 옵션이 달라서, 지원하는 모델에만 붙인다.
export function supportsEffort(model: string) {
  return /^claude-(fable|mythos|opus-5|opus-4-[5-9]|sonnet-5|sonnet-4-[6-9])/.test(model);
}

export function supportsServerFallback(model: string) {
  return /^claude-(fable-5|mythos-5|opus-5|sonnet-5-5)/.test(model);
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly retryable = true,
  ) {
    super(message);
  }
}

export function describeAiError(err: unknown): { message: string; retryable: boolean } {
  if (err instanceof ConfigError) return { message: err.message, retryable: false };
  if (err instanceof AiError) return { message: err.message, retryable: err.retryable };
  if (err instanceof Anthropic.AuthenticationError) {
    return { message: "AI 키 설정에 문제가 있어요. 관리자에게 알려 주세요.", retryable: false };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { message: "지금 요청이 많아요. 잠시 후 다시 시도해 주세요.", retryable: true };
  }
  if (err instanceof Anthropic.BadRequestError) {
    return { message: "AI 요청 형식에 문제가 있어요. 다시 시도해 주세요.", retryable: true };
  }
  if (err instanceof Anthropic.APIError) {
    return { message: "AI 응답을 받지 못했어요. 다시 시도해 주세요.", retryable: true };
  }
  return { message: "AI 응답을 받지 못했어요. 다시 시도해 주세요.", retryable: true };
}
