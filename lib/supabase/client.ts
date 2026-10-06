import { createBrowserClient } from "@supabase/ssr";

// 브라우저용 클라이언트. 공개(publishable) 키만 사용하고, 읽기 권한도 RLS로 자기 데이터만.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  );
}
