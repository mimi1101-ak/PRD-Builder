"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Provider = "google" | "kakao";

export function LoginButtons({ next, className }: { next: string; className?: string }) {
  const [pending, setPending] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      toast.error("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setPending(null);
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <button
        type="button"
        onClick={() => signIn("kakao")}
        disabled={pending !== null}
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FEE500] text-sm font-medium text-black/85 transition hover:brightness-95 disabled:opacity-60"
      >
        {pending === "kakao" ? <Loader2 className="size-4 animate-spin" /> : <KakaoIcon />}
        카카오로 시작하기
      </button>
      <button
        type="button"
        onClick={() => signIn("google")}
        disabled={pending !== null}
        className="flex h-11 items-center justify-center gap-2 rounded-lg border bg-white text-sm font-medium text-black/85 transition hover:bg-neutral-50 disabled:opacity-60"
      >
        {pending === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        구글로 시작하기
      </button>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.48 2 10.78c0 2.76 1.84 5.18 4.6 6.56l-.94 3.44c-.08.3.26.54.52.37l4.1-2.72c.56.08 1.13.12 1.72.12 5.52 0 10-3.48 10-7.77S17.52 3 12 3Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.9a5.05 5.05 0 0 1-2.2 3.3v2.75h3.55c2.08-1.92 3.25-4.74 3.25-8.08Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.55-2.75c-.99.66-2.25 1.06-3.73 1.06-2.87 0-5.3-1.94-6.16-4.54H2.17v2.84A11 11 0 0 0 12 23Z"
      />
      <path fill="#FBBC05" d="M5.84 14.12a6.6 6.6 0 0 1 0-4.24V7.04H2.17a11 11 0 0 0 0 9.92l3.67-2.84Z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.17 7.04l3.67 2.84C6.7 7.32 9.13 5.38 12 5.38Z"
      />
    </svg>
  );
}
