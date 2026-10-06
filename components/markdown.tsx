import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base prose-p:leading-7 prose-li:my-0.5 prose-table:my-4 prose-th:bg-muted/60 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-code:before:content-none prose-code:after:content-none",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

// 채팅 말풍선용: 문단·굵게 정도만 쓰는 가벼운 버전
export function ChatMarkdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 leading-7 [&_strong]:font-semibold">
      <ReactMarkdown
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
