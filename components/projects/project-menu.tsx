"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EllipsisVertical, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { readJsonError } from "@/lib/ndjson";
import { cn } from "@/lib/utils";

// 프로젝트 줄 오른쪽의 ⋮ 부가 메뉴. 지금은 삭제하기만 있다.
export function ProjectMenu({
  projectId,
  title,
  unlocked,
  className,
}: {
  projectId: string;
  title: string;
  unlocked: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);

  async function remove() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error((await readJsonError(res)).message);
        setRunning(false);
        return;
      }
      toast.success("프로젝트를 삭제했어요");
      setConfirmOpen(false);
      router.refresh();
    } catch {
      toast.error("연결이 끊겼어요. 다시 시도해 주세요.");
    }
    setRunning(false);
  }

  return (
    <>
      {/* modal={false}: 메뉴가 닫히며 확인 창이 열릴 때 화면 클릭이 막히지 않게 */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${title} 메뉴`}
            className={cn("text-muted-foreground hover:text-foreground", className)}
          >
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 />
            삭제하기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmOpen} onOpenChange={(next) => !running && setConfirmOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-light tracking-[-0.03em]">프로젝트 삭제</DialogTitle>
            <DialogDescription>
              &lsquo;{title}&rsquo;의 대화와 문서가 모두 지워지고, 되돌릴 수 없어요.
              {unlocked && " 잠금 해제에 쓴 크레딧도 돌아오지 않아요."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={running}>
              취소
            </Button>
            <Button variant="destructive" onClick={remove} disabled={running}>
              {running ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {running ? "삭제하는 중…" : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
