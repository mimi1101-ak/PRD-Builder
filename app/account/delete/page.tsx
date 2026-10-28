import { getViewer } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { loadCredits } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_ROBOTS } from "@/lib/site";
import { LoginButtons } from "@/components/login-buttons";
import { DeleteAccountCard } from "@/components/account/delete-account-card";

export const metadata = { title: "회원 탈퇴", robots: PRIVATE_ROBOTS };

// 회원 탈퇴 (처리는 app/api/account)
export default async function DeleteAccountPage() {
  const viewer = await getViewer();

  if (!viewer.userId) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-[20px] border px-7 pb-7 pt-8 text-center">
          <p className="mono-label text-muted-foreground">Account</p>
          <h1 className="display-title mt-2 text-[40px]">회원 탈퇴</h1>
          <p className="mt-3 text-sm text-muted-foreground">탈퇴하려면 먼저 로그인해 주세요.</p>
          <LoginButtons next="/account/delete" className="mt-6" />
        </div>
      </main>
    );
  }

  const [developer, credits, { data }] = await Promise.all([
    isAdmin(viewer.userId),
    loadCredits(viewer.userId),
    (await createClient()).auth.getUser(),
  ]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <DeleteAccountCard email={data.user?.email ?? null} credits={credits} developer={developer} />
    </main>
  );
}
