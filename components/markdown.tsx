import ReactMarkdown, { type Components } from "react-markdown";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// 한글 바로 앞에서 닫히는 **굵게**(예: **주로 쓸 사람(멤버)**이)도 굵게로 읽는다
const plugins = [remarkGfm, remarkCjkFriendly];

type HastNode = { type: string; value?: string; children?: HastNode[] };

function nodeText(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(nodeText).join("");
}

// "3. 핵심 기능" → { no: "03", rest: "핵심 기능" }
export function splitHeadingNumber(text: string) {
  const m = text.trim().match(/^(\d{1,2})[.)]\s+(.+)$/);
  return m ? { no: m[1].padStart(2, "0"), rest: m[2] } : null;
}

// 목차에서 이 제목으로 건너뛰기 위한 id (마크다운 기호는 빼고 만든다)
export function headingId(text: string) {
  const slug = text
    .replace(/[*_`]/g, "")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `sec-${slug}`;
}

const docComponents: Components = {
  h2: ({ node, children }) => {
    const text = nodeText(node as HastNode | undefined);
    const parts = typeof children === "string" ? splitHeadingNumber(children) : null;
    return (
      <h2 id={headingId(text)}>
        {parts ? (
          <>
            <span className="sec-no">{parts.no}</span>
            <span>{parts.rest}</span>
          </>
        ) : (
          children
        )}
      </h2>
    );
  },
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("doc-prose", className)}>
      <ReactMarkdown remarkPlugins={plugins} components={docComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

// 채팅 말풍선용: 문단·굵게 정도만 쓰는 가벼운 버전
export function ChatMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("space-y-3 leading-7 [&_strong]:font-semibold", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkCjkFriendly]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          h1: ({ children }) => <p className="font-semibold">{children}</p>,
          h2: ({ children }) => <p className="font-semibold">{children}</p>,
          h3: ({ children }) => <p className="font-semibold">{children}</p>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
