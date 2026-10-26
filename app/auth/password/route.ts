import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUEST_COOKIE, claimGuestProjects, isUuid, safeNextPath } from "@/lib/access";

// 이메일·비밀번호 로그인 (회사가 발급한 계정 전용, 예: 결제 심사용). 가입 화면은 따로 없다.
// 로그인 페이지의 폼이 POST 로 보내고, 끝나면 303 으로 다음 화면에 보낸다.
export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(String(form.get("next") ?? ""), "/projects");

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/login?mode=email&next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`, request.url),
      { status: 303 },
    );

  if (!email || !password) return fail("이메일과 비밀번호를 입력해 주세요.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return fail("이메일 또는 비밀번호가 맞지 않아요.");

  // 구글·카카오 콜백과 같이: 프로필 보장 + 로그인 전에 만든 프로젝트를 계정으로 옮기기
  const user = data.user;
  const nickname = String(user.user_metadata?.nickname || user.email?.split("@")[0] || "메이커").slice(0, 40);
  await createAdminClient().from("profiles").upsert({ id: user.id, nickname }, { onConflict: "id", ignoreDuplicates: true });

  const cookieStore = await cookies();
  const guest = cookieStore.get(GUEST_COOKIE)?.value;
  if (isUuid(guest)) {
    await claimGuestProjects(user.id, guest);
    cookieStore.delete(GUEST_COOKIE);
  }

  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}
