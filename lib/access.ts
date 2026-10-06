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

// 다른 페이지로 보낼 때 외부 주소로 새지 않게 내부 경로만 허용
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
