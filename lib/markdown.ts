// 마크다운을 "## 제목" 단위 섹션으로 나누고 바꿔 끼우는 도구.
// 코드 블록(```) 안의 "## " 줄은 제목으로 보지 않는다.

export type Section = {
  heading: string; // "## 3. 핵심 기능" 같은 제목 줄 전체
  title: string; // "3. 핵심 기능"
  start: number; // content 안의 시작 줄 번호
  end: number; // 끝 줄 번호(포함하지 않음)
};

export function splitSections(content: string): Section[] {
  const lines = content.split("\n");
  const sections: Section[] = [];
  let fence: string | null = null;

  lines.forEach((line, i) => {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      return;
    }
    if (fence) return;
    const h = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h) {
      if (sections.length) sections[sections.length - 1].end = i;
      sections.push({ heading: line.trimEnd(), title: h[1].trim(), start: i, end: lines.length });
    }
  });
  return sections;
}

export function getSection(content: string, heading: string): string | null {
  const section = splitSections(content).find((s) => s.heading === heading);
  if (!section) return null;
  return content.split("\n").slice(section.start, section.end).join("\n").trimEnd();
}

export function replaceSection(content: string, heading: string, replacement: string): string | null {
  const section = splitSections(content).find((s) => s.heading === heading);
  if (!section) return null;
  const lines = content.split("\n");
  const before = lines.slice(0, section.start);
  const after = lines.slice(section.end);
  const body = replacement.trim().split("\n");
  // 다음 섹션과 붙지 않게 빈 줄 하나를 둔다.
  const glue = after.length ? [""] : [];
  return [...before, ...body, ...glue, ...after].join("\n");
}

// AI 가 문서 전체를 ``` 로 감싸 보낸 경우 벗겨 낸다.
export function stripOuterFence(text: string) {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/);
  return m ? m[1].trim() : trimmed;
}

// 작업 단계 문서를 화면용 단계 목록으로 읽는다. 형식이 다르면 null.
export type TaskStep = {
  number: number;
  title: string;
  heading: string;
  goal: string;
  prompt: string;
  check: string;
};

export function parseTaskSteps(content: string): { intro: string; steps: TaskStep[] } | null {
  const sections = splitSections(content);
  const lines = content.split("\n");
  const steps: TaskStep[] = [];

  for (const s of sections) {
    const m = s.title.match(/^(\d+)\s*단계\s*[.:)]?\s*(.*)$/);
    if (!m) continue;
    const body = lines.slice(s.start + 1, s.end).join("\n");
    const goal = body.match(/\*\*목표[:：]?\*\*[:：]?\s*(.+)/)?.[1]?.trim() ?? "";
    const check = body.match(/\*\*완료\s*확인[:：]?\*\*[:：]?\s*(.+)/)?.[1]?.trim() ?? "";
    const prompt = body.match(/```[a-zA-Z]*\s*\n([\s\S]*?)\n\s*```/)?.[1]?.trim() ?? "";
    steps.push({ number: Number(m[1]), title: m[2].trim(), heading: s.heading, goal, prompt, check });
  }

  if (steps.length < 3 || steps.some((s) => !s.prompt)) return null;
  const intro = lines
    .slice(0, sections[0]?.start ?? 0)
    .join("\n")
    .trim();
  return { intro, steps };
}
