import Link from "next/link";
import { DeleteAccountForm } from "@/components/account/delete-account-form";

// 로그인한 사람의 탈퇴 화면: 무엇이 지워지고 무엇이 남는지 보여 주고, 확인 글자를 입력하면 바로 탈퇴
export function DeleteAccountCard({
  email,
  credits,
  developer,
}: {
  email: string | null;
  credits: number;
  developer: boolean;
}) {
  return (
    <div className="w-full max-w-md rounded-[20px] border px-7 pb-7 pt-8">
      <p className="mono-label text-muted-foreground">Account</p>
      <h1 className="display-title mt-2 text-[40px]">회원 탈퇴</h1>
      {email && <p className="mt-3 break-all text-sm text-muted-foreground">{email} 계정</p>}

      {developer ? (
        <p className="mt-6 rounded-xl bg-muted px-3 py-2 text-sm text-ink-2">개발자 계정은 여기서 탈퇴할 수 없어요.</p>
      ) : (
        <>
          <div className="mt-6 space-y-4 text-sm leading-6">
            <section>
              <h2 className="font-medium">바로 지워지는 것</h2>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
                <li>내 프로젝트, 아이디어 대화, 만든 문서</li>
                <li>남은 크레딧 {credits}건</li>
                <li>로그인 정보 (같은 계정으로 다시 로그인하면 새 계정이 만들어져요)</li>
              </ul>
            </section>
            <section>
              <h2 className="font-medium">법에 따라 남는 것</h2>
              <p className="mt-1 text-ink-2">
                결제 기록(주문번호·금액·날짜)은 전자상거래법에 따라 5년 동안 보관한 뒤 지워요. 탈퇴하면 계정과의 연결은 끊겨요.
              </p>
            </section>
            {credits > 0 && (
              <p className="rounded-xl bg-muted px-3 py-2 text-ink-2">
                결제 후 7일이 지나지 않은 미사용 크레딧은 탈퇴 전에 환불을 신청할 수 있어요.{" "}
                <Link href="/refund" className="underline underline-offset-4 hover:text-foreground">
                  환불정책 보기
                </Link>
              </p>
            )}
          </div>
          <DeleteAccountForm />
        </>
      )}

      <Link href="/projects" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">
        탈퇴하지 않고 돌아가기
      </Link>
    </div>
  );
}
