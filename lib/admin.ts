import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 개발자 계정인지 (profiles.is_admin). 브라우저에서는 바꿀 수 없는 칸이라 서버에서 이것만 믿는다.
// 확인에 실패하면 항상 "아님"으로 본다.
export async function isAdmin(userId: string | null | undefined) {
  if (!userId) return false;
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (error) return false;
  return data?.is_admin === true;
}
