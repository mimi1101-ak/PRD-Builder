import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getViewer, isUuid } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { loadRecentGrants } from "@/lib/admin-grants";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/ndjson";
import { MAX_GRANT_CREDITS } from "@/lib/domain";

const GrantSchema = z.object({
  userId: z.string().refine(isUuid),
  amount: z.number().int().min(1).max(MAX_GRANT_CREDITS),
  memo: z.string().max(100).default(""),
});

// 개발자 도구: 크레딧 넣어 주기. 개발자 확인·지급·기록은 grant_credits 함수 안에서 한 번에 처리한다.
async function handlePOST(request: Request) {
  const viewer = await getViewer();
  if (!viewer.userId || !(await isAdmin(viewer.userId))) return jsonError(404, "찾을 수 없어요.");

  const parsed = GrantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, `크레딧은 1~${MAX_GRANT_CREDITS}건까지 넣을 수 있어요.`);
  const { userId, amount, memo } = parsed.data;

  const admin = createAdminClient();
  const { data: credits, error } = await admin.rpc("grant_credits", {
    p_admin_id: viewer.userId,
    p_user_id: userId,
    p_amount: amount,
    p_memo: memo,
  });
  if (error) throw error;
  if (typeof credits !== "number") return jsonError(404, "받을 사용자를 찾지 못했어요.");

  return Response.json({ credits, grants: await loadRecentGrants() });
}

export const POST = withErrors(handlePOST);
