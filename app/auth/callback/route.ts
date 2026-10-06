import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUEST_COOKIE, claimGuestProjects, isUuid, safeNextPath } from "@/lib/access";

// 구글·카카오 로그인 후 돌아오는 곳. 세션을 만들고, 로그인 전에 만든 프로젝트를 계정으로 옮긴다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/projects");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const user = data.user;
      const admin = createAdminClient();
      // 트리거가 만들지 못한 경우를 대비해 프로필을 보장 (크레딧 0으로 시작)
      const meta = user.user_metadata ?? {};
      const nickname = String(
        meta.nickname || meta.name || meta.full_name || meta.user_name || user.email?.split("@")[0] || "메이커",
      ).slice(0, 40);
      await admin.from("profiles").upsert({ id: user.id, nickname }, { onConflict: "id", ignoreDuplicates: true });

      const cookieStore = await cookies();
      const guest = cookieStore.get(GUEST_COOKIE)?.value;
      if (isUuid(guest)) {
        await claimGuestProjects(user.id, guest);
        cookieStore.delete(GUEST_COOKIE);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth] exchange failed", error);
  }

  const reason = searchParams.get("error_description") ?? "로그인에 실패했어요.";
  return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(reason)}`);
}
