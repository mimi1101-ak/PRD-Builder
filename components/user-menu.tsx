"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ nickname }: { nickname: string }) {
  const router = useRouter();
  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh(); // 헤더(서버 컴포넌트)를 로그아웃 상태로 다시 그린다
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-40">
          <span className="truncate">{nickname}님</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href="/projects">내 프로젝트</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/credits">크레딧 충전</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
