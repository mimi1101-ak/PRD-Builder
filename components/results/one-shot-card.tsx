import { Button } from "@/components/ui/button";
import { PromptBox } from "@/components/results/doc-body";
import { ONE_SHOT_PROMPT, toolName, toolStopHint } from "@/lib/domain";

const FOLDER_TREE = `내-프로젝트/
├── CLAUDE.md
└── docs/
    ├── PRD.md
    └── TASKS.md`;

// 원샷 모드: 작업 단계 탭 맨 위에 보이는 안내. "확인 없이 끝까지"가 겁나지 않게 안전장치를 먼저 보여 준다.
export function OneShotCard({ tool, onPickStep }: { tool: string; onPickStep: () => void }) {
  const name = toolName(tool);
  const safeguards = [
    {
      title: "언제든 멈출 수 있어요",
      desc: `${toolStopHint(tool)} "이어서 진행해"로 다시 시작하거나, 위에서 단계별로 바꿔 남은 단계를 하나씩 해도 돼요.`,
    },
    {
      title: "가짜로 채우지 않아요",
      desc: '결제·로그인처럼 키가 필요한 부분은 비워 두고, 마지막에 "키 필요" 목록으로 알려 줘요.',
    },
    {
      title: "AI가 정한 건 기록에 남아요",
      desc: "정해지지 않았던 부분을 어떻게 정했는지 docs/DECISIONS.md에 적어요. 마음에 안 들면 바꿔 달라고 하면 돼요.",
    },
    {
      title: "허락 요청은 그대로예요",
      desc: `파일을 고치거나 명령을 실행할 때 ${name}가 허락을 묻는 건 설정에 따라 그대로 떠요.`,
    },
  ];
  const howTo: React.ReactNode[] = [
    <>
      받은 세 파일을 빈 폴더에 이렇게 넣어요.
      <pre className="mt-2.5 overflow-x-auto rounded-xl border bg-muted px-[18px] py-3.5 font-mono text-[12.5px] leading-[1.85] text-ink-2">
        {FOLDER_TREE}
      </pre>
    </>,
    <>
      {name}에 Supabase MCP(AI가 Supabase를 직접 다루게 해 주는 연결)를 연결해 두세요. AI가 DB를 직접 만들어요. 기존
      데이터가 없는 새 Supabase 프로젝트로 시작하세요.
    </>,
    <>
      아래 프롬프트를 {name}에 붙여 넣으면, TASKS.md 순서대로 마지막 단계까지 확인 없이 진행해요.
      <PromptBox text={ONE_SHOT_PROMPT} fullHeight />
    </>,
    <>
      끝나면 &ldquo;키 필요&rdquo; 목록대로 키를 <code className="rounded bg-muted px-1.5 py-px font-mono text-[0.86em] text-foreground">.env.local</code>에
      넣고, 아래 단계별 &ldquo;완료 확인&rdquo;으로 직접 눌러 보세요.
    </>,
  ];

  return (
    <section
      aria-labelledby="one-shot-title"
      className="mt-7 rounded-[20px] border border-foreground bg-background px-[18px] pb-5 pt-[22px] sm:px-7 sm:pb-[26px] sm:pt-7"
    >
      <p className="mono-label text-[10px] text-muted-foreground">One-shot</p>
      <h2
        id="one-shot-title"
        className="mt-2.5 font-display text-[26px] font-light leading-[1.3] tracking-[-0.03em]"
      >
        프롬프트 한 번으로 끝까지 만들기
      </h2>
      <p className="mt-2 text-[14.5px] leading-[1.75] text-ink-2">
        단계마다 결과를 확인받지 않고, TASKS.md를 마지막 단계까지 이어서 진행해요. 그래도 언제든 멈추고 고칠 수 있어요.
      </p>

      <ul aria-label="안전장치" className="mt-[18px] grid gap-2 sm:grid-cols-2">
        {safeguards.map((s) => (
          <li key={s.title} className="rounded-xl border px-4 py-3.5">
            <b className="block text-sm font-semibold tracking-[-0.01em]">{s.title}</b>
            <p className="mt-1 text-[13px] leading-[1.65] text-muted-foreground">{s.desc}</p>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-muted px-4 py-3 text-[13.5px] text-ink-2">
        <span>처음 만든다면 단계별 모드를 추천해요. 한 단계씩 결과를 보면서 따라갈 수 있어요.</span>
        <Button size="sm" variant="outline" onClick={onPickStep}>
          단계별로 보기
        </Button>
      </div>

      <p className="mono-label mt-[26px] text-[10px] text-muted-foreground">How to start</p>
      <ol className="mt-4 space-y-2">
        {howTo.map((item, i) => (
          <li key={i} className="grid grid-cols-[30px_minmax(0,1fr)] text-[14.5px] leading-[1.75] text-ink-2">
            <span className="pt-[3px] font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">{item}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
