import "server-only";
import { ConfigError } from "@/lib/env";
import { jsonError } from "@/lib/ndjson";

// API 라우트에서 예상 못 한 오류가 나도 화면이 이해할 수 있는 JSON 오류로 돌려준다.
// 환경변수 누락(ConfigError)은 무엇을 채워야 하는지 그대로 알려 준다.
export function withErrors<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api]", err);
      if (err instanceof ConfigError) return jsonError(500, err.message, "config");
      return jsonError(500, "서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.", "server");
    }
  };
}
