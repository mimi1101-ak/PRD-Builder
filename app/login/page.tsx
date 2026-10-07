import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, safeNextPath } from "@/lib/access";
import { LoginButtons } from "@/components/login-buttons";
import { Logo } from "@/components/logo";

export const metadata = { title: "로그인" };

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = safeNextPath(typeof searchParams.next === "string" ? searchParams.next : null, "/projects");
  const error = typeof searchParams.error === "string" ? searchParams.error : null;

  const viewer = await getViewer();
  if (viewer.userId) redirect(next);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-[20px] border px-7 pb-7 pt-8">
        <div className="mb-7 text-center">
          <Logo className="mx-auto size-7" />
          <p className="mono-label mt-5 text-muted-foreground">Sign in</p>
          <h1 className="display-title mt-2 text-[40px]">로그인</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            만든 아이디어와 문서를 저장하고 언제든 이어서 볼 수 있어요.
          </p>
        </div>
        {error && <p className="mb-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <LoginButtons next={next} />
        <p className="mt-4 text-center text-xs text-muted-foreground">
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
      </div>
    </main>
  );
}
