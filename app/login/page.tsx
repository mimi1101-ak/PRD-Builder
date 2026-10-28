import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, safeNextPath } from "@/lib/access";
import { LoginButtons } from "@/components/login-buttons";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "로그인" };

// 주소창의 error 는 정해 둔 코드만 받는다. 주소에 쓴 글이 그대로 화면에 뜨면 가짜 안내문을 띄울 수 있어서.
// 코드는 app/auth/callback(oauth)·app/auth/password(missing, invalid) 가 붙인다.
const LOGIN_ERRORS: Record<string, string> = {
  oauth: "로그인에 실패했어요.",
  missing: "이메일과 비밀번호를 입력해 주세요.",
  invalid: "이메일 또는 비밀번호가 맞지 않아요.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = safeNextPath(typeof searchParams.next === "string" ? searchParams.next : null, "/projects");
  const errorCode = typeof searchParams.error === "string" ? searchParams.error : null;
  const error = errorCode ? (Object.hasOwn(LOGIN_ERRORS, errorCode) ? LOGIN_ERRORS[errorCode] : LOGIN_ERRORS.oauth) : null;
  const mode = typeof searchParams.mode === "string" ? searchParams.mode : null;

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
        {/* 회사가 발급한 계정(결제 심사용 등)만 쓰는 이메일 로그인. 가입은 받지 않는다. */}
        <details open={mode === "email"} className="group mt-4 text-sm">
          <summary className="cursor-pointer list-none text-center text-xs text-muted-foreground hover:text-foreground">
            이메일 계정으로 로그인
          </summary>
          <form action="/auth/password" method="post" className="mt-3 grid gap-2">
            <input type="hidden" name="next" value={next} />
            <Input type="email" name="email" placeholder="이메일" autoComplete="username" required className="h-11" />
            <Input
              type="password"
              name="password"
              placeholder="비밀번호"
              autoComplete="current-password"
              required
              className="h-11"
            />
            <Button type="submit" size="lg" className="h-11 w-full">
              로그인
            </Button>
          </form>
        </details>
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
