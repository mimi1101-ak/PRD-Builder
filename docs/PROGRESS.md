# 작업 현황 (2026-10-07 기준)

내일 이어서 할 때 이 파일부터 읽으세요. 요구사항 원문은 `docs/PRD.md`, 실행 방법은 `README.md`.

## 완료

| PRD 단계 | 내용 | 확인 |
| --- | --- | --- |
| 1~2. 프로젝트·화면 뼈대 | Next.js 16 + Tailwind 4 + shadcn/ui, 화면 전체 (`/`, `/p/[id]/chat`, `/p/[id]`, `/projects`, `/credits`, `/terms`, `/privacy`, `/login`) | 빌드·린트·타입 검사 통과 |
| 4. DB·RLS | Supabase 프로젝트 `prd-builder`(id `nxejnobwhfhvkdytjxcm`, 서울). 테이블 5개 + RLS + 크레딧 SQL 함수. `supabase/migrations/20261006000000_init.sql` | 보안 점검 경고 0건, 규칙 테스트 21항목 통과 |
| 5. 질문 인터뷰 | `/api/chat` + `lib/prompts/interview.md` (질문: `claude-haiku-4-5`) | 브라우저로 끝까지 진행: 첫 글자 2.5초 이내, 8문항 만에 최종 확인, "잘 모르겠어요"·직접 입력·새로고침 이어하기·최종 확인 수정 모두 정상 |
| 6. 문서 생성 | `/api/documents/generate` + `lib/prompts/documents.md` (문서: `claude-opus-5-5`) | 서버에서 실제 생성: PRD 9개 목차 정확, 작업 단계 13단계 파싱 성공, CLAUDE.md 정상 |
| 7. 복사·다운로드 | 문서별 복사·.md, zip(잠금 해제 시) | 코드 완료, 로그인 후 화면 확인 필요 |
| 8. 내 프로젝트·이어하기 | 로그인 전 프로젝트는 쿠키로 저장 → 로그인 시 계정으로 이동 | 게스트 목록·이어하기 확인 |
| 9~10. 결제·잠금 해제 | 토스 결제창·승인·웹훅, 크레딧 차감, 다시 쓰기 3회, 무료 생성 하루 3회 | DB 규칙은 테스트 완료. 토스 키 없음 → 크레딧 화면은 "결제 준비 중" |

## 남은 일 (다음에 할 것)

1. **로그인 켜기** — Supabase 대시보드에서 카카오·구글 로그인 활성화, Redirect URLs 에 `http://localhost:3000/**` 추가 (README 3번).
   현재 상태: 구글·카카오 꺼짐, 이메일 로그인만 켜짐.
2. 로그인 후 브라우저로 확인: PRD 자동 생성 → (테스트 크레딧 SQL 로 지급) → 잠금 해제 → 작업 단계 카드·CLAUDE.md → 섹션 다시 쓰기 → zip.
3. 토스페이먼츠 테스트 키 받으면 `.env.local` 에 넣고 결제 테스트.
4. 배포(Vercel): 환경변수 6개, Supabase Redirect URLs 에 배포 주소 추가.

## 알아 둘 것

- `.env.local` 은 git 에 올리지 않는다. 비밀 키(Supabase secret, Anthropic)는 이 파일에만 있다.
- `npm run dev` 는 `--use-system-ca` 로 실행된다. Avast 백신의 HTTPS 검사 때문에 Supabase 연결이 인증서 오류로 실패하던 문제를 막는다.
- 질문·문서 품질은 `lib/prompts/*.md` 만 고치면 된다 (개발 서버는 저장 즉시 반영).
- 테스트로 만든 프로젝트 "헬스장 출석 체크"가 DB 에 남아 있다(게스트 소유, 견본으로 사용 가능).
