import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "@/lib/env";

// RLS를 우회하는 서버 전용 클라이언트. 크레딧·결제·문서 쓰기처럼 서버만 해야 하는 일에만 쓴다.
// 절대 브라우저 코드에서 import 하지 않는다 ("server-only" 가 빌드 단계에서 막아 준다).
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
