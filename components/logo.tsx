import { cn } from "@/lib/utils";

// 말풍선 + 문서 모양의 단순한 로고
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("text-brand", className)}>
      <rect x="4" y="4" width="20" height="24" rx="4" fill="currentColor" opacity="0.18" />
      <rect x="8" y="2" width="20" height="24" rx="4" fill="currentColor" />
      <path d="M12.5 9.5h11M12.5 14h11M12.5 18.5h6.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
