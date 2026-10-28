import { cookies } from "next/headers";
import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getViewer, isCrossOrigin } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/ndjson";
import { DELETE_CONFIRM_WORD } from "@/lib/domain";

const DeleteSchema = z.object({ confirm: z.literal(DELETE_CONFIRM_WORD) });

// 회원 탈퇴 (개인정보 보호법: 삭제 요구가 가입보다 어렵지 않게).
// 계정을 지우면 DB 연결 규칙에 따라 프로필·프로젝트·대화·문서가 함께 지워지고,
// 결제·크레딧 지급 기록은 사용자 연결만 끊긴 채 법정 기간 동안 남는다 (supabase/migrations 의 on delete 규칙).
async function handleDELETE(request: Request) {
  if (isCrossOrigin(request)) return jsonError(403, "다른 사이트에서 보낸 요청은 받지 않아요.");

  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "로그인이 필요해요.", "login_required");

  const parsed = DeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, `확인 칸에 '${DELETE_CONFIRM_WORD}'를 입력해 주세요.`, "confirm_required");

  // 개발자 계정은 실수로 지우지 않게 여기서는 막는다 (필요하면 Supabase 에서 직접)
  if (await isAdmin(viewer.userId)) return jsonError(403, "개발자 계정은 여기서 탈퇴할 수 없어요.", "developer");

  const { error } = await createAdminClient().auth.admin.deleteUser(viewer.userId);
  if (error) {
    console.error("[account] delete failed", error.message);
    return jsonError(500, "탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  // 로그인 쿠키 지우기. 계정이 이미 없어서 로그아웃 요청이 실패해도 쿠키는 직접 지운다.
  try {
    await (await createClient()).auth.signOut();
  } catch {
    // 무시
  }
  const cookieStore = await cookies();
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith("sb-")) cookieStore.delete(c.name);
  }

  return Response.json({ ok: true });
}

export const DELETE = withErrors(handleDELETE);
