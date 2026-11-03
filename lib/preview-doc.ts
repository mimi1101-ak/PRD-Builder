import "server-only";
import fs from "node:fs";
import path from "node:path";
import {
  PREVIEW_ACCENTS,
  PREVIEW_KITS,
  type PreviewAccent,
  type PreviewContent,
  type PreviewKit,
} from "@/lib/preview";

// 화면 미리보기 문서 조립: AI 가 쓴 HTML 조각 + 디자인 키트(CSS·글꼴·아이콘·실행 도우미) → 문서 한 장.
// 이 문서는 화면에서 격리된 iframe(srcdoc)으로 돌리고, 같은 문서를 HTML 파일로 내려받는다.

const PRETENDARD =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

// 키트별 제목 글꼴 (모두 고딕 계열, 구글 폰트)
const KIT_FONTS: Record<PreviewKit, string> = {
  paper: "https://fonts.googleapis.com/css2?family=Gothic+A1:wght@600;700;800;900&display=swap",
  soft: "https://fonts.googleapis.com/css2?family=Jua&display=swap",
  console: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap",
  poster: "https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap",
  night: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap",
};

// AI 가 쓴 코드가 밖으로 아무것도 보내지 못하게: 연결·이미지·폼 전송 막고, 글꼴만 허용
const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "img-src data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

type Kit = { css: string; icons: string; runtime: string };
let cached: Kit | null = null;

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), "lib", "preview-kit", file), "utf8");
}

// 주석과 줄 앞 공백만 덜어 낸다 (문서 크기를 줄이려는 것, 규칙은 그대로)
function compactCss(css: string) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function loadKit(): Kit {
  // 개발 중에는 매번 다시 읽어 키트 수정이 바로 반영되게 한다
  if (cached && process.env.NODE_ENV === "production") return cached;
  cached = {
    css: compactCss(read("base.css") + "\n" + read("kits.css")),
    icons: read("icons.js"),
    runtime: read("runtime.js"),
  };
  return cached;
}

// 스크립트 끝 태그 글자가 섞여도 문서가 깨지지 않게
const safeScript = (js: string) => js.replace(/<\/script/gi, "<\\/script");

export function buildPreviewDoc(content: Pick<PreviewContent, "kit" | "accent" | "html">) {
  const kit = loadKit();
  return (
    `<!doctype html><html lang="ko" data-kit="${content.kit}" data-accent="${content.accent}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">` +
    `<title>화면 미리보기</title>` +
    `<link rel="stylesheet" href="${PRETENDARD}"><link rel="stylesheet" href="${KIT_FONTS[content.kit]}">` +
    `<style>${kit.css}</style><script>${safeScript(kit.icons)}</script><script>${safeScript(kit.runtime)}</script>` +
    `</head><body>${content.html}</body></html>`
  );
}

// 첫 줄 "<!-- kit: paper | accent: brown -->" 을 읽고 나머지를 HTML 조각으로 돌려준다
export function splitKitHeader(raw: string): { kit: PreviewKit; accent: PreviewAccent; html: string } {
  const text = raw.trim();
  const head = text.match(/^<!--\s*kit:\s*(\w+)\s*\|\s*accent:\s*(\w+)\s*-->/);
  const kit = PREVIEW_KITS.find((k) => k === head?.[1]) ?? "soft";
  const accent = PREVIEW_ACCENTS.find((a) => a === head?.[2]) ?? "blue";
  return { kit, accent, html: head ? text.slice(head[0].length).trim() : text };
}

// DB 에 저장된 미리보기 (형식이 다르면 null — 2026-11-03 첫 시안의 JSON 형식 등)
export function readPreviewContent(raw: unknown): PreviewContent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 2 || typeof r.html !== "string" || !r.html.trim()) return null;
  const kit = PREVIEW_KITS.find((k) => k === r.kit);
  const accent = PREVIEW_ACCENTS.find((a) => a === r.accent);
  if (!kit || !accent) return null;
  return { version: 2, kit, accent, html: r.html };
}

// 만들기 전 화면에 보여 주는 예시 (시험용 PRD "점심투표"로 실제 프롬프트를 돌린 결과)
let sample: string | null = null;
export function samplePreviewDoc() {
  if (!sample || process.env.NODE_ENV !== "production") {
    sample = buildPreviewDoc(splitKitHeader(read("sample.html")));
  }
  return sample;
}
