// 생성한 문서끼리 어긋나지 않는지 AI 호출 없이 검사한다.
// CLAUDE.md 를 먼저 만들고 TASKS.md 가 그것을 따르므로, 검사는 TASKS.md 에 건다.
// 걸리면 생성 API가 TASKS.md 만 한 번 다시 만든다.

// `src/app`, `src/lib/x.ts` 같은 경로나 `--src-dir` 옵션. URL 안의 /src/ 와 `--no-src-dir` 은 제외.
const SRC_PATH = /(?<![\w./-])src\/[\w[]/;
const SRC_DIR_FLAG = /(?<!no-)--src-dir\b/;

export function usesSrcDir(text: string) {
  return SRC_PATH.test(text) || SRC_DIR_FLAG.test(text);
}

// CLAUDE.md 의 "## 폴더 구조" 섹션 (없으면 문서 전체)
function folderSection(claudeMd: string) {
  const match = claudeMd.match(/^##[^\n]*폴더[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/m);
  return match ? match[1] : claudeMd;
}

// "CLAUDE.md를 만든다", "CLAUDE.md는 아직 없으니 이번 단계에서 만든다", "CLAUDE.md 파일 생성" 같은 지시.
// 사이에 다른 절("읽고 ", "옮겼다가, ")이 끼면 CLAUDE.md 가 목적어가 아니므로 제외한다.
// 명사 "생성"은 "- CLAUDE.md 생성"처럼 줄·문장 끝에 올 때만 지시로 본다 ("생성이 끝나면"은 제외).
const CREATE_CLAUDE_MD =
  /CLAUDE\.md(?:(?![가-힣]고\s|다가|,\s)[^.!?\n]){0,30}?(만든다|만들어|만들고|만들기|만듭니다|생성한다|생성해|생성하고|생성합니다|작성한다|작성해|작성하고|작성합니다|생성(?=\s*(?:하기)?\s*(?:[.)]|$)))/gm;
// 지시 뒤 같은 문장 안에 부정이 오면("…만들고 덮어쓰지 않는다" 같은 경우가 아니라 "만들지 않는다"류) 제외
const NEGATION_AFTER = /^[^.!?\n]*?(않|말고|말 것|마세요|마$|마[.,!]|금지|건너뛰|안 된다|안 돼)/;

export function findCreateClaudeMd(text: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(CREATE_CLAUDE_MD)) {
    const rest = text.slice((m.index ?? 0) + m[0].length);
    if (NEGATION_AFTER.test(rest)) continue;
    hits.push(m[0].trim());
  }
  return hits;
}

export type DocIssue = { code: "src_mismatch" | "creates_claude_md"; message: string };

export function checkTasks(tasks: string, claudeMd: string | null): DocIssue[] {
  const issues: DocIssue[] = [];
  if (claudeMd) {
    const tasksSrc = usesSrcDir(tasks);
    const claudeSrc = usesSrcDir(folderSection(claudeMd));
    if (tasksSrc !== claudeSrc) {
      issues.push({
        code: "src_mismatch",
        message: tasksSrc
          ? "TASKS.md는 src/ 폴더를 쓰는데 CLAUDE.md 폴더 구조에는 src/가 없어요."
          : "CLAUDE.md 폴더 구조는 src/를 쓰는데 TASKS.md에는 src/가 없어요.",
      });
    }
  }
  const creates = findCreateClaudeMd(tasks);
  if (creates.length) {
    issues.push({
      code: "creates_claude_md",
      message: `TASKS.md가 CLAUDE.md를 새로 만들라고 지시해요: ${creates.map((c) => `"${c}"`).join(", ")}`,
    });
  }
  return issues;
}
