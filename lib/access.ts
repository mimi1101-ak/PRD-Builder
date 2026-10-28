import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectRow } from "@/lib/domain";

// 로그인 전 사용자는 브라우저 쿠키(guest token)로 자기 프로젝트를 구분한다.
export const GUEST_COOKIE = "prd_guest";
const GUEST_MAX_AGE = 60 * 60 * 24 * 30; // 30일

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export type Viewer = {
  userId: string | null;
  guestToken: string | null;
};

export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  const cookieStore = await cookies();
  const guest = cookieStore.get(GUEST_COOKIE)?.value;
  return {
    userId: typeof sub === "string" && sub ? sub : null,
    guestToken: isUuid(guest) ? guest : null,
  };
}

// Route Handler 안에서만 호출 (쿠키 쓰기 가능)
export async function ensureGuestToken(viewer: Viewer): Promise<string> {
  if (viewer.guestToken) return viewer.guestToken;
  const token = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_MAX_AGE,
  });
  return token;
}

export function canAccess(project: Pick<ProjectRow, "user_id" | "guest_token">, viewer: Viewer) {
  if (project.user_id) return project.user_id === viewer.userId;
  return !!project.guest_token && project.guest_token === viewer.guestToken;
}

export async function getProjectForViewer(projectId: string, viewer: Viewer) {
  if (!isUuid(projectId)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!data || !canAccess(data as ProjectRow, viewer)) return null;
  return data as ProjectRow;
}

// 로그인 직후: 이 브라우저에서 로그인 없이 만든 프로젝트를 계정으로 옮긴다.
export async function claimGuestProjects(userId: string, guestToken: string) {
  const admin = createAdminClient();
  await admin
    .from("projects")
    .update({ user_id: userId, guest_token: null })
    .eq("guest_token", guestToken)
    .is("user_id", null);
}

// 다른 페이지로 보낼 때 외부 주소로 새지 않게 내부 경로만 허용.
// 브라우저는 주소 속 탭·줄바꿈을 지우고 \ 를 / 로 읽는다 ("/\t/evil.com" → "//evil.com" = 외부 사이트).
// 그래서 이런 글자가 든 주소는 받지 않고, 실제로 주소를 풀어 봐도 우리 사이트 안인지 한 번 더 확인한다.
const NEXT_BASE = "https://dot.invalid";
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }
  try {
    if (new URL(next, NEXT_BASE).origin !== NEXT_BASE) return fallback;
  } catch {
    return fallback;
  }
  return next;
}

// 다른 사이트의 폼이 보낸 요청인지 (로그인 CSRF: 남의 사이트가 방문자를 몰래 다른 계정으로 로그인·로그아웃시키는 것).
// 브라우저는 POST 요청에 Origin 을 붙인다. 없으면 Sec-Fetch-Site 로 보고, 둘 다 없으면(브라우저가 아님) 막지 않는다.
export function isCrossOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin !== new URL(request.url).origin;
  return request.headers.get("sec-fetch-site") === "cross-site";
}
