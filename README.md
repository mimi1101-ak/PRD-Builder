# dot.PRD — 질문형 PRD 생성기

아이디어 한 줄 → AI 기획자의 질문 5~10개 → 최종 확인 → **PRD · 작업 단계 · CLAUDE.md**.
요구사항 원문은 [`docs/PRD.md`](docs/PRD.md).

## 1. 지금 상태

| 항목 | 상태 |
| --- | --- |
| Supabase 프로젝트 `prd-builder` (서울) | 생성 완료, 테이블 5개 + RLS + SQL 함수 적용 |
| `.env.local` | Supabase 주소·공개 키 입력됨. **비밀 키 3종은 직접 입력 필요** |
| 구글·카카오 로그인 | Supabase 대시보드에서 직접 켜야 함 (아래 3번) |

## 2. 실행

```bash
npm install
npm run dev
```

`.env.local`에 아래 값을 채운 뒤 http://localhost:3000 을 엽니다.

> `npm run dev` 는 Windows 인증서 저장소를 쓰도록(`--use-system-ca`) 설정돼 있습니다. Avast 같은 백신이 HTTPS 를 검사하면
> Supabase 연결이 `unable to verify the first certificate` 로 실패하는데, 이 설정이 그 문제를 막아 줍니다.
> 토스 키가 비어 있으면 크레딧 화면이 "결제 준비 중"으로 보이고, 나머지 기능은 그대로 동작합니다.

| 변수 | 어디서 | 비고 |
| --- | --- | --- |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret keys | 서버 전용 |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | 월 사용 한도·알림도 여기서 설정 (PRD 9장) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` | 토스페이먼츠 개발자센터 → API 키 → **API 개별 연동 키** | `test_ck_` / `test_sk_` 테스트 키 |

## 3. 로그인 설정 (Supabase 대시보드)

1. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (배포 후에는 실제 주소)
   - Redirect URLs: `http://localhost:3000/**` (배포 후 `https://내도메인/**` 추가)
2. **Authentication → Sign In / Providers → Google**: Google Cloud 콘솔에서 OAuth 클라이언트를 만들고 Client ID·Secret 입력.
   승인된 리디렉션 URI: `https://nxejnobwhfhvkdytjxcm.supabase.co/auth/v1/callback`
3. **Authentication → Sign In / Providers → Kakao**: Kakao Developers 앱의 REST API 키(Client ID)와 Client Secret 입력.
   - 카카오 로그인 Redirect URI: `https://nxejnobwhfhvkdytjxcm.supabase.co/auth/v1/callback`
   - 이메일 동의항목은 비즈 앱 심사가 필요하므로, 심사 전이면 Supabase Kakao 설정에서 **Allow users without an email**을 켭니다.

## 4. 결제 (토스페이먼츠 테스트 모드)

- 결제창 → `/credits/success` → 서버가 토스 **승인 API**를 호출해 `DONE`을 확인한 뒤에만 크레딧 지급.
- 같은 주문은 `complete_payment` SQL 함수가 한 번만 처리 (새로고침해도 1번만 증가).
- 웹훅(선택): 개발자센터 → 웹훅에 `https://내도메인/api/payments/webhook` 등록, 이벤트 `PAYMENT_STATUS_CHANGED`.
  웹훅 본문은 믿지 않고 토스 API로 상태를 다시 조회해 처리합니다.

## 5. 배포 (Vercel)

환경변수 6개를 Vercel → Settings → Environment Variables 에 그대로 넣고, Supabase Redirect URLs 에 배포 주소를 추가합니다.
실결제 전환은 사업자등록·통신판매업 신고 후 라이브 키로 교체합니다 (PRD 8장 미결 사항).

## 6. 구조

- `app/` 화면·API (`/api/chat` 인터뷰, `/api/documents/*` 문서, `/api/payments/*` 결제)
- `lib/prompts/interview.md`, `lib/prompts/documents.md` — 프롬프트 원문. **질문·문서 품질은 이 파일만 고치면 됩니다.**
- `supabase/migrations/` — DB 스키마·RLS·크레딧 함수
- 모델: 질문 `claude-haiku-4-5`, 문서 `claude-opus-5-5` (`.env.local`에서 바꿀 수 있음)
