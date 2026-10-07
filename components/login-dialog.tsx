"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoginButtons } from "@/components/login-buttons";

export function LoginDialog({
  open,
  onOpenChange,
  next,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-light tracking-[-0.03em]">로그인하고 PRD 받기</DialogTitle>
          <DialogDescription>
            지금까지의 대화는 그대로 저장돼요. 로그인하면 바로 PRD를 만들어 드릴게요.
          </DialogDescription>
        </DialogHeader>
        <LoginButtons next={next} />
        <p className="text-center text-xs text-muted-foreground">
          계속하면{" "}
          <Link href="/terms" className="underline">
            이용약관
          </Link>
          과{" "}
          <Link href="/privacy" className="underline">
            개인정보처리방침
          </Link>
          에 동의하게 돼요.
        </p>
      </DialogContent>
    </Dialog>
  );
}
