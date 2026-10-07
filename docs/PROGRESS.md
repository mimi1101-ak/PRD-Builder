# 작업 현황 (2026-10-07 밤 기준)

다음에 이어서 할 때 이 파일부터 읽으세요. 요구사항 원문은 `docs/PRD.md`, 실행 방법은 `README.md`.

## 완료

| PRD 단계 | 내용 | 확인 |
| --- | --- | --- |
| 1~2. 프로젝트·화면 뼈대 | Next.js 16 + Tailwind 4 + shadcn/ui, 화면 전체 (`/`, `/p/[id]/chat`, `/p/[id]`, `/projects`, `/credits`, `/terms`, `/privacy`, `/login`) | 빌드·린트·타입 검사 통과 |
| 4. DB·RLS | Supabase 프로젝트 `prd-builder`(id `nxejnobwhfhvkdytjxcm`, 서울). 테이블 5개 + RLS + 크레딧 SQL 함수. `supabase/migrations/20261006000000_init.sql` | 보안 점검 경고 0건, 규칙 테스트 21항목 통과 |
| 5. 질문 인터뷰 | `/api/chat` + `lib/prompts/interview.md` (질문: `claude-haiku-4-5`) | 브라우저로 끝까지 진행: 첫 글자 2.5초 이내, 8문항 만에 최종 확인, "잘 모르겠어요"·직접 입력·새로고침 이어하기·최종 확인 수정 모두 정상 |
| 6. 문서 생성 | `/api/documents/generate` + `lib/prompts/documents.md` (문서: `claude-opus-5-5`) | 서버에서 실제 생성: PRD 9개 목차 정확, 작업 단계 13단계 파싱 성공, CLAUDE.md 정상 |
| 7. 복사·다운로드 | 문서별 복사·.md, zip(잠금 해제 시) | 브라우저로 확인 완료 (zip 내용물 포함) |
| 8. 내 프로젝트·이어하기 | 로그인 전 프로젝트는 쿠키로 저장 → 로그인 시 계정으로 이동 | 게스트 목록·이어하기 확인 |
| 9~10. 결제·잠금 해제 | 토스 결제창·승인·웹훅, 크레딧 차감, 다시 쓰기 3회, 무료 PRD 생성 계정당 3개(2026-10-07 변경) | DB 규칙은 테스트 완료. 토스 키 없음 → 크레딧 화면은 "결제 준비 중" |
| 리디자인 (2026-10-07) | 흑백(흰색 위주) + 픽셀 블랙홀 배경. 시안은 `../design-mockup/index.html` (`node design-mockup/serve.js`, 4310) | 빌드·린트·타입 통과. 첫 화면·대화·로그인·내 프로젝트·약관·404 브라우저 확인, 휴대폰 390px 가로 스크롤 없음 |

## 디자인 규칙 (리디자인)

- 글꼴: 제목 **Hahmlet**(`font-display`, `display-title`), 본문 **Pretendard**(npm `pretendard`, 글자 범위별 분할 파일), 작은 라벨 **Geist Mono**(`mono-label`). `app/layout.tsx`
- 색: 흰 바탕 + 검정(`--foreground` #0b0b0b). 예전 주황 `brand` 토큰은 검정으로 바뀌었다. 회색 단계 `ink-2`·`muted-foreground`·`ink-4`, 선 `border`·`line-strong`. `app/globals.css`
- 버튼은 모두 알약 모양(`components/ui/button.tsx`). 카카오 노랑·구글 로고 색은 각 회사 로그인 버튼 규정이라 그대로 둔다.
- 배경: `components/black-hole.tsx` — `hero`(첫 화면, 약 1분에 한 바퀴, 별 3개가 천천히 나타났다 사라짐), `corner`(대화·결과 화면 오른쪽 아래, 옅게 멈춤). 움직임 줄이기 설정이면 멈춘 한 장면, 화면에 안 보이면 멈춘다.
- 문서 본문은 `.doc-prose`(globals.css). `## 3. 핵심 기능` 의 번호는 작은 고정폭 글자로 보이고, 결과 화면 왼쪽 목차가 이 제목들로 만들어진다.
- 블랙홀 핵: 격자 칸을 꽉 채운 픽셀 원. 넓은 화면에서도 반지름 24px 이하(`maxCore`). 원반은 화면 폭에 맞춰 커진다.
- **MOMO**: 대화 상대역 검은 픽셀 고양이(앉은 모습, 24×23칸). `components/momo.tsx`, 도안 `../design-mockup/momo.html`. 대화 화면에서 질문하는 쪽 이름은 "MOMO".
- 대화의 질문 문장은 본문과 같은 크기, 진한 색·조금 굵게만 (예전에 답이 끝나는 순간 크게 바뀌던 문제 수정).
- 마크다운에 `remark-cjk-friendly`: `**주로 쓸 사람(멤버)**이` 처럼 한글 앞에서 닫히는 굵게가 별표로 보이던 문제 수정.
- 첫 화면 문구는 사용자가 직접 정했다(2026-10-07): "아이디어 한 줄로 시작해서, / 개발에 바로 쓰는 기획서까지." 등. 바꿀 때 사용자 확인 필요.

## 남은 일 (다음에 할 것)

0. **리디자인 이어서**
   - 결과 문서 화면(`/p/[id]`)은 로그인이 필요해 새 디자인을 브라우저로 아직 못 봤다 → 목차·탭·작업 단계 카드·잠금 카드 확인.
   - 머리글·로그인 화면의 점 9개 로고를 MOMO 로 바꿀지 사용자에게 물어볼 것.
   - 내 프로젝트 목록에 삭제 기능 추가(2026-10-07): 줄 오른쪽 ⋮ 메뉴 → 삭제하기 → 확인 창 → `DELETE /api/projects/[id]`(대화·문서 함께 삭제). 사용자가 직접 2개 삭제해 동작 확인.
   - 내 프로젝트 "우주 보기" 추가(2026-10-07, 시안 `design-mockup/universe.html` 승인 후 적용): 프로젝트마다 픽셀 행성(모양·색·이름은 id 로 고정, `lib/planet-art.ts`), 미완성은 "모이는 점", 한 페이지 가로 5 × 세로 2(휴대폰 2 × 5), 넘기기는 양옆 버튼·아래 표시·끌기·키보드. 「우주 | 목록」 전환은 쿠키 `prd_projects_view` 로 기억. 우주 보기일 땐 `[data-universe]` 로 페이지 전체가 어두워짐(globals.css).
   - 서비스 이름을 dot.PRD 로 정함(2026-10-07): 머리글·탭 제목·바닥글·약관·개인정보처리방침·결제 상품명·README·CLAUDE.md 의 "PRD 빌더" 표기를 모두 바꿈. 점 9개 로고는 유지.

1. ~~로그인 켜기~~ 완료(2026-10-07): 구글·카카오 모두 로그인·계정 생성 확인(카카오 이메일·닉네임 받음).
   - 카카오: 개인 개발자 비즈 앱 전환 → [앱]>[플랫폼 키]>REST API 키 화면에서 리다이렉트 URI·클라이언트 시크릿(카카오 로그인용). Supabase Client ID 는 **REST API 키**(다른 키 넣으면 KOE006).
2. ~~로그인 후 브라우저 확인~~ 완료(구글 계정, 테스트 크레딧 3 지급): PRD → 잠금 해제(크레딧 3→2, 작업 단계 14단계 카드) → CLAUDE.md → 섹션 다시 쓰기(3→2회) → zip(docs/PRD.md·docs/TASKS.md·CLAUDE.md).
   - 고친 것: 잠금 해제 후 헤더의 크레딧 숫자가 새로고침 전까지 안 바뀌던 문제 → `components/results/result-view.tsx` 에서 크레딧이 바뀌면 `router.refresh()`. 다음 잠금 해제 때 바로 바뀌는지 한 번 더 확인할 것.
3. 토스페이먼츠 테스트 키 받으면 `.env.local` 에 넣고 결제 테스트.
4. ~~배포(Vercel)~~ 완료(2026-10-07): https://dot-prd.vercel.app (GitHub main 자동 배포, Vercel 프로젝트 이름 `dot-prd.vercel.app`). 환경변수 4개(토스 2개는 키 없어서 뺌). Supabase Site URL·Redirect URLs 에 배포 주소 등록. 배포 사이트 로그인 확인 필요.
5. **구글·카카오 로그인 공개 준비** (2026-10-07 진행 중)
   - 구글 클라우드 OAuth: 범위는 email·profile·openid 만. 브랜딩(앱 이름 dot.PRD, 로고 `../brand/dotprd-logo-120.png`)이 "홈페이지 소유 미확인"으로 반려 → 서치 콘솔에서 `https://dot-prd.vercel.app` 소유권 확인 완료(meta 태그 + `public/google258d639182ad46b3.html`, 둘 다 지우지 말 것).
   - **다음:** 2026-10-08 이후 브랜딩 화면 [문제 보기 → 문제를 해결함 → 계속]으로 재인증 요청. [대상]에서 앱 게시 상태가 "테스트 중"이면 게시(안 하면 다른 사람은 구글 로그인 불가).
   - 카카오: 앱 아이콘을 `../brand/dotprd-logo-128.png` 로, 회사명 MIYA STUDIO, 앱 이름 dot.PRD 로 바꾸기(사용자가 직접).
   - 그다음 다른 계정으로 배포 사이트 로그인·PRD 생성 확인.
6. 운영자 이름 MIYA STUDIO(바닥글·약관 상호·개인정보처리방침 운영자), 개인정보 문의 연락처 기재 완료. 사업자등록 후 약관의 대표자·사업자등록번호 등 채우기.
7. ~~개발자 도구~~ 완료(2026-10-07, 시안 `design-mockup/admin.html` 승인 후 적용, 마이그레이션 `developer_tools`):
   - `profiles.is_admin` = 운영자 계정 2개(erin8751@gmail.com 구글, erin8751@naver.com 카카오)만 true. 브라우저에서는 못 바꿈. 새 개발자 계정은 SQL 로 직접 켠다.
   - 개발자 계정: 무료 PRD·다시 쓰기 제한 없음, 잠금 해제 때 크레딧 차감 없음(`unlock_project` 안에서), 확인 창 생략. 분당 메시지 제한은 유지.
   - `/admin`: 이메일로 사용자 찾기 → 크레딧 1~100건 넣기(+메모) → 최근 지급 내역. `grant_credits` 함수가 개발자 확인·지급·`credit_grants` 기록을 한 번에. 넣기만 있고 빼기는 없음.
   - 개발자가 아니면 `/admin`·`/api/admin/*` 모두 404. 사용자 메뉴의 "개발자 도구" 링크도 개발자만 보임.
   - 화면 아래를 MOMO 가 돌아다님(`components/admin/momo-walker.tsx`, 걷기 두 장·앉기·깜빡·졸기, 누르면 한마디, 지급하면 축하).
   - 다음 dev 서버를 동시에 두 개 못 띄움(Next 16). 다른 창에서 3000 이 떠 있으면 `npm run build` 후 `prd-builder-prod`(next start, 3100) 로 확인.
8. 참고: Anthropic 콘솔에 월 사용 한도 걸기, 결제 열면 Vercel Pro 로 전환(Hobby 는 비상업용). 로그인 창의 supabase.co 주소를 없애려면 내 도메인 + Supabase Custom Domain(유료).

## 알아 둘 것

- `.env.local` 은 git 에 올리지 않는다. 비밀 키(Supabase secret, Anthropic)는 이 파일에만 있다.
- `npm run dev` 는 `--use-system-ca` 로 실행된다. Avast 백신의 HTTPS 검사 때문에 Supabase 연결이 인증서 오류로 실패하던 문제를 막는다.
- 질문·문서 품질은 `lib/prompts/*.md` 만 고치면 된다 (개발 서버는 저장 즉시 반영).
- 테스트로 만든 프로젝트 "헬스장 출석 체크", "카페 스탬프"(리디자인 확인용, 질문 1개까지)가 DB 에 남아 있다(게스트 소유, 견본으로 사용 가능).
