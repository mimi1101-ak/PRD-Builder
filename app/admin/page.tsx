import { notFound } from "next/navigation";
import { getViewer } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { loadRecentGrants } from "@/lib/admin-grants";
import { AdminTools } from "@/components/admin/admin-tools";

export const metadata = { title: "개발자 도구", robots: { index: false, follow: false } };

const PERKS = [
  { label: "내 계정", value: null },
  { label: "무료 PRD", value: "제한 없음" },
  { label: "잠금 해제", value: "크레딧 차감 없음" },
  { label: "다시 쓰기", value: "제한 없음" },
];

// 개발자 계정(profiles.is_admin)만 볼 수 있다. 그 외에는 로그인 여부와 상관없이 없는 페이지(404)로 보인다.
export default async function AdminPage() {
  const viewer = await getViewer();
  if (!(await isAdmin(viewer.userId))) notFound();

  const grants = await loadRecentGrants();

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-32 pt-10 sm:px-8">
      <p className="mono-label text-muted-foreground">Developer</p>
      <h1 className="display-title mt-3 text-[clamp(36px,5vw,56px)]">개발자 도구</h1>

      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y py-5">
        {PERKS.map((p) => (
          <div key={p.label} className="min-w-[140px]">
            <p className="mono-label text-muted-foreground">{p.label}</p>
            {p.value ? (
              <p className="mt-1.5 text-[15px] font-medium">{p.value}</p>
            ) : (
              <span className="mt-1.5 inline-flex h-[22px] items-center gap-1.5 rounded-full bg-foreground px-2.5 font-mono text-[10.5px] tracking-[0.05em] text-background">
                ● 무제한
              </span>
            )}
          </div>
        ))}
      </div>

      <AdminTools initialGrants={grants} />
    </main>
  );
}
