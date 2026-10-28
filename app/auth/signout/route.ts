import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCrossOrigin } from "@/lib/access";

export async function POST(request: Request) {
  // 다른 사이트가 방문자를 몰래 로그아웃시키지 못하게
  if (isCrossOrigin(request)) return new Response("다른 사이트에서 보낸 요청은 받지 않아요.", { status: 403 });

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
