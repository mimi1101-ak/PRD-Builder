import { IdeaComposer } from "@/components/home/idea-composer";
import { Logo } from "@/components/logo";

// 첫 화면: 인사말 두 줄 + 입력창만 (PRD F1, 클로드 첫 화면 참고). 로그인 없이 바로 입력.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="flex items-center justify-center gap-2 text-lg text-muted-foreground">
            <Logo className="size-5" />
            어서오세요
          </p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            어떤 아이디어를 만들어볼까요?
          </h1>
        </div>
        <IdeaComposer />
      </div>
    </main>
  );
}
