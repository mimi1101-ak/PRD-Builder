"use client";

import { useRef, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MomoWalker, type MomoWalkerHandle } from "@/components/admin/momo-walker";
import { readJsonError } from "@/lib/ndjson";
import { MAX_GRANT_CREDITS } from "@/lib/domain";
import type { AdminGrant, AdminUser } from "@/lib/admin-grants";

const PROVIDERS: Record<string, string> = { google: "구글", kakao: "카카오" };
const QUICK = [1, 5, 10];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(new Date(iso));
}

function clampAmount(n: number) {
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 1), MAX_GRANT_CREDITS) : 1;
}

export function AdminTools({ initialGrants }: { initialGrants: AdminGrant[] }) {
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState(1);
  const [memo, setMemo] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantMessage, setGrantMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [grants, setGrants] = useState(initialGrants);
  const momo = useRef<MomoWalkerHandle>(null);

  const user = users.find((u) => u.id === selectedId) ?? null;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchError(null);
    setGrantMessage(null);
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email.trim())}`);
      if (!res.ok) {
        setSearchError((await readJsonError(res)).message);
        setUsers([]);
        return;
      }
      const data = (await res.json()) as { users: AdminUser[] };
      setUsers(data.users);
      setSelectedId(data.users[0]?.id ?? null);
      if (data.users.length === 0) setSearchError("이 이메일로 가입한 사용자가 없어요.");
    } catch {
      setSearchError("검색하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSearching(false);
    }
  }

  async function grant() {
    if (!user) return;
    setGranting(true);
    setGrantMessage(null);
    try {
      const res = await fetch("/api/admin/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount, memo: memo.trim() }),
      });
      if (!res.ok) {
        setGrantMessage({ ok: false, text: (await readJsonError(res)).message });
        return;
      }
      const data = (await res.json()) as { credits: number; grants: AdminGrant[] };
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, credits: data.credits } : u)));
      setGrants(data.grants);
      setGrantMessage({ ok: true, text: `✓ ${user.email} 에게 크레딧 ${amount}건을 넣었어요.` });
      momo.current?.cheer(`+${amount}건 배달 완료!`);
      setMemo("");
    } catch {
      setGrantMessage({ ok: false, text: "크레딧을 넣지 못했어요. 다시 시도해 주세요." });
    } finally {
      setGranting(false);
    }
  }

  return (
    <>
      <h2 className="mb-1.5 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">크레딧 넣어 주기</h2>
      <p className="text-sm text-muted-foreground">받을 사람의 로그인 이메일(구글·카카오 계정 이메일)로 찾아요.</p>

      <form onSubmit={search} className="mt-4 flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@gmail.com"
          aria-label="받을 사람 이메일"
          className="h-11 flex-1 rounded-xl px-3.5"
        />
        <Button type="submit" className="h-11 rounded-xl px-5" disabled={searching}>
          {searching && <Loader2 className="animate-spin" />}찾기
        </Button>
      </form>
      {searchError && <p className="mt-2.5 text-sm text-destructive">{searchError}</p>}

      {users.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {users.map((u) => (
            <Button
              key={u.id}
              size="sm"
              variant={u.id === selectedId ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setSelectedId(u.id)}
            >
              {u.nickname ?? "메이커"} · {PROVIDERS[u.provider ?? ""] ?? u.provider}
            </Button>
          ))}
        </div>
      )}

      {user && (
        <section className="mt-4 rounded-[20px] border p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold">{user.nickname ?? "메이커"}</p>
              <p className="break-all text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                가입 {formatDate(user.createdAt)} · {PROVIDERS[user.provider ?? ""] ?? user.provider ?? "로그인"} · 프로젝트{" "}
                {user.projectCount}개
              </p>
            </div>
            <div className="sm:text-right">
              <p className="mono-label text-muted-foreground">지금 크레딧</p>
              <p className="font-display text-[56px] font-extralight leading-none tracking-[-0.05em]">
                {user.credits}
                <span className="ml-1 font-sans text-[15px] font-normal tracking-normal text-muted-foreground">건</span>
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t pt-6">
            <div>
              <p className="mb-2 text-[13px] font-semibold">넣을 크레딧</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-xl"
                  aria-label="1 줄이기"
                  onClick={() => setAmount((n) => clampAmount(n - 1))}
                >
                  <Minus />
                </Button>
                <Input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(clampAmount(parseInt(e.target.value, 10)))}
                  aria-label="넣을 크레딧 수"
                  className="h-11 w-[72px] rounded-xl text-center font-mono text-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-xl"
                  aria-label="1 늘리기"
                  onClick={() => setAmount((n) => clampAmount(n + 1))}
                >
                  <Plus />
                </Button>
                {QUICK.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-ink-2"
                    onClick={() => setAmount(n)}
                  >
                    {n}건
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold">
                메모 <span className="font-normal text-muted-foreground">(선택 · 나만 봐요)</span>
              </p>
              <Input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={100}
                placeholder="예: 베타 테스터 감사 선물"
                className="h-11 rounded-xl px-3.5"
              />
            </div>
            <p className="text-sm text-ink-2">
              넣으면 <b className="font-mono">{user.credits}</b>건 → <b className="font-mono">{user.credits + amount}</b>
              건이 돼요.
            </p>
            <div className="flex justify-end">
              <Button className="h-11 rounded-xl px-5" onClick={grant} disabled={granting}>
                {granting && <Loader2 className="animate-spin" />}
                {amount}건 넣어 주기
              </Button>
            </div>
          </div>
          {grantMessage && (
            <p
              className={`mt-4 rounded-xl px-3.5 py-3 text-sm ${grantMessage.ok ? "bg-muted" : "bg-destructive/10 text-destructive"}`}
            >
              {grantMessage.text}
            </p>
          )}
        </section>
      )}

      <h2 className="mb-4 mt-12 font-display text-[26px] font-light tracking-[-0.03em]">최근 지급 내역</h2>
      {grants.length === 0 ? (
        <p className="border-t pt-4 text-sm text-muted-foreground">아직 넣어 준 크레딧이 없어요.</p>
      ) : (
        <ul className="border-t text-sm">
          {grants.map((g) => (
            <li
              key={g.id}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b py-3.5 sm:grid-cols-[96px_1fr_auto]"
            >
              <span className="col-span-2 text-[13px] text-muted-foreground sm:col-span-1">{formatDate(g.createdAt)}</span>
              <span className="min-w-0 truncate">{g.email ?? "(탈퇴한 사용자)"}</span>
              <span className="font-mono font-medium">+{g.amount}</span>
              <span className="col-span-2 text-[13px] text-muted-foreground sm:col-start-2">{g.memo ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}

      <MomoWalker ref={momo} />
    </>
  );
}
