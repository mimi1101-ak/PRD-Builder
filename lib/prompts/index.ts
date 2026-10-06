import "server-only";
import fs from "node:fs";
import path from "node:path";

// 프롬프트 원문은 lib/prompts/*.md 에 두고 코드와 분리한다 (PRD 7장).
// 파일 안의 `<!-- @section 이름 -->` 표시로 여러 조각을 나눈다.

const cache = new Map<string, Record<string, string>>();

function loadSections(file: string): Record<string, string> {
  // 개발 중에는 매번 다시 읽어 프롬프트 수정이 바로 반영되게 한다.
  if (process.env.NODE_ENV === "production") {
    const cached = cache.get(file);
    if (cached) return cached;
  }
  const raw = fs.readFileSync(path.join(process.cwd(), "lib", "prompts", file), "utf8");
  const sections: Record<string, string> = {};
  const parts = raw.split(/^<!--\s*@section\s+([a-z_]+)\s*-->\s*$/m);
  // parts = [머리말, 이름1, 본문1, 이름2, 본문2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    sections[parts[i]] = parts[i + 1].trim();
  }
  cache.set(file, sections);
  return sections;
}

export function promptSection(file: "interview.md" | "documents.md", name: string): string {
  const section = loadSections(file)[name];
  if (section === undefined) {
    throw new Error(`lib/prompts/${file} 에 "${name}" 섹션이 없습니다.`);
  }
  return section;
}

// {{변수}} 채우기. 값이 없는 변수는 그대로 두지 않고 빈 문자열로 바꾼다.
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => (key in vars ? String(vars[key]) : ""));
}
