import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseSecretKey } from "@/lib/env";

// 남용 방지 횟수 제한 (런칭 보안 심사: AI 비용 폭주 막기). 숫자는 lib/domain.ts.
// 정해진 시간 칸마다 DB 함수 hit_rate_limit 이 횟수를 원자적으로 센다 (supabase/migrations/20261028200000_rate_limits.sql).

// 요청 보낸 사람의 IP 를 횟수 세기용 키로 바꾼다.
// - IP 는 Vercel 이 붙여 주는 값을 쓴다 (브라우저가 보낸 값은 Vercel 이 덮어써서 위조할 수 없다)
// - IPv6 는 한 집·한 기기가 같은 대역(/64) 안에서 주소를 계속 바꿀 수 있어 앞 4칸으로 센다
// - IP 는 그대로 저장하지 않고 비밀 키를 섞은 해시로만 저장한다
export function clientIpKey(request: Request) {
  const ip = (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
  return createHash("sha256").update(`${supabaseSecretKey()}:${ipBlock(ip)}`).digest("hex").slice(0, 32);
}

function ipBlock(ip: string) {
  if (!ip) return "unknown";
  const v4 = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/); // IPv4, IPv4 가 붙은 IPv6(::ffff:1.2.3.4)
  if (v4) return v4[1];
  if (!ip.includes(":")) return ip;
  // "2001:db8::1" 처럼 줄여 쓴 주소를 8칸으로 펼친 뒤 앞 4칸만
  const [head, tail] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups =
    tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return `${groups
    .slice(0, 4)
    .map((g) => g.toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

// 한 번 센다. 허용이면 true.
// DB 확인에 실패하면 막지 않는다 (제한 기능 때문에 서비스 전체가 멈추지 않게). 실패는 기록만 남긴다.
export async function hitRateLimit(key: string, limit: number, window: "10 minutes" | "1 day") {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window: window,
  });
  if (error) {
    console.error("[rate-limit] check failed", error.message);
    return true;
  }
  return data === true;
}
