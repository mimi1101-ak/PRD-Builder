@AGENTS.md

# PRD 빌더 (질문형 PRD 생성기)

## 프로젝트 개요
- 아이디어 한 줄 → AI 기획자가 질문 5~10개로 빈 곳을 채움 → 최종 확인 → PRD·작업 단계·CLAUDE.md 생성.
- 대상: 클로드 코드·커서로 SaaS를 만들어 본 비전공 바이브코더.
- 자세한 요구사항은 `docs/PRD.md`. 결과물은 사람이 아니라 AI 코딩 도구가 읽는 입력이다.

## 기술 스택
- Next.js 16 (App Router, Turbopack) + TypeScript — `middleware` 대신 `proxy.ts`, `params`/`cookies()` 는 모두 async
- Tailwind CSS 4 + shadcn/ui (radix-nova), 아이콘 lucide-react
- Supabase (Postgres + Auth: 구글·카카오), `@supabase/ssr`
- Anthropic API: 질문 `claude-haiku-4-5`(빠르고 쌈), 문서 `claude-opus-5-5`(상위 모델, 서버 측 fallback 사용)
- 토스페이먼츠 결제창 SDK v2 (일반결제, 테스트 모드)

## 폴더 구조
- `app/` 화면과 API 라우트 (`app/api/*`)
- `components/` 화면 조각 (`components/ui` 는 shadcn 원본)
- `lib/prompts/*.md` AI 프롬프트 원문 — 질문·문서 품질은 이 파일만 고친다
- `lib/ai/` AI 호출, `lib/supabase/` DB 클라이언트, `lib/domain.ts` 공통 타입·상수
- `supabase/migrations/` DB 스키마와 RLS

## 작업 규칙
- 한 번에 한 단계만 작업한다. 코드를 고치기 전에 무엇을 왜 바꿀지 계획부터 설명한다.
- 요청하지 않은 기능·파일을 만들지 않는다.
- 비밀 값(Anthropic·토스 시크릿·Supabase secret 키)은 `.env.local` 에만 두고, 브라우저 코드에서 쓰지 않는다. 서버 전용 모듈은 `import "server-only"`.
- 크레딧·결제·문서·대화 쓰기는 서버(service_role)에서만. 크레딧 변경은 `supabase/migrations` 의 SQL 함수로 원자적으로 처리한다.
- 모든 테이블 RLS 유지. 새 테이블을 만들면 RLS와 정책도 함께 만든다.
- 사용자는 비전공자다. 화면 문구와 설명에서 개발 용어에는 한 줄 풀이를 붙인다.
- 단계가 끝나면 브라우저에서 직접 확인할 방법을 알려 준다.

## 자주 쓰는 명령
- `npm run dev` 개발 서버 (http://localhost:3000)
- `npm run build` 프로덕션 빌드, `npm run lint` 린트, `npx tsc --noEmit` 타입 검사
