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
8. **단계별 / 원샷 모드** (2026-10-08, 시안 `../design-mockup/modes.html` 승인 후 적용, 개선안 `../dot.PRD 개선안 — 단계별 원샷 모드 (수정본).md`)
   - 문서 생성·DB·크레딧은 그대로. 잠금 해제(크레딧 1건)하면 두 모드 모두 쓸 수 있다.
   - 결과 화면: 잠금 해제 뒤 제목 아래 「단계별 | 원샷」 전환(브라우저에 프로젝트별 기억, `prd-builder:mode:{id}`). 바꾸면 작업 단계 탭으로 이동.
   - 원샷이면 작업 단계 탭 맨 위에 `components/results/one-shot-card.tsx`: 안전장치 4개, 단계별 추천, 폴더 그림, 자동 완성 프롬프트(`lib/domain.ts` 의 `ONE_SHOT_PROMPT`, 사용자가 준 원문을 다듬은 것). 도구 이름·멈추는 법은 프로젝트의 도구(클로드 코드/커서/기타)에 맞춤.
   - 잠금 카드 혜택에 "한 번에 끝까지 만드는 원샷 프롬프트" 한 줄 추가.
   - 확인: 임시 견본 페이지로 잠김·단계별·원샷·커서 문구·새로고침 유지·390px 확인(로컬 로그인 없음). **배포 후 실제 계정으로 한 번 더 확인할 것.**
9. 참고: Anthropic 콘솔에 월 사용 한도 걸기, 결제 열면 Vercel Pro 로 전환(Hobby 는 비상업용). 로그인 창의 supabase.co 주소를 없애려면 내 도메인 + Supabase Custom Domain(유료).
10. **PRD 미리보기** (2026-10-28, 시안 `../design-mockup/prd-preview.html` 승인 후 적용, 마이그레이션 `20261028000000_prd_preview.sql`)
   - 인터뷰·PRD 생성은 무제한 무료(계정당 3개 제한 없앰). 잠금 해제 전에는 PRD 1~3장만 브라우저로 보낸다(`lib/domain.ts` `PRD_PREVIEW_SECTIONS`). 4장부터는 장 제목만 보내 목차·잠금 카드에 자물쇠로 보여 준다.
   - 자르기는 서버에서만(`lib/markdown.ts` `splitPrdPreview`, 만드는 중에는 `streamingPrdPreview`). DB 에는 PRD 전체가 저장되고, 작업 단계·CLAUDE.md 생성에도 전체를 쓴다.
   - 크레딧 1건 = PRD 나머지 + 작업 단계 + CLAUDE.md. 첫 유료 문서(CLAUDE.md)가 만들어지는 순간 차감·잠금 해제되고 PRD 전체가 함께 열린다.
   - 이 변경 전에 만든 PRD 는 `projects.prd_free = true` 로 계속 전체 공개. 새 가입 크레딧 0건(기존 잔액 그대로).
   - 확인: 임시 견본 페이지로 잠김(크레딧 0·있음)·확인 창·TASKS 카드·예전 PRD·375px 확인, 잠긴 장 내용이 HTML 에 없는 것 확인. **배포 후 실제 계정으로 새 PRD 생성 → 잠금 해제까지 한 번 더 확인할 것.**
11. **보안 1단계** (2026-10-28, 런칭 보안 심사 후속. 심사 보고서는 저장소 밖 `../dot.PRD 런칭 보안 심사 (2026-10-28).md`)
   - 마이그레이션 `20261028100000_documents_server_only.sql`: 로그인 사용자의 documents·messages 읽기 권한과 정책을 없앰(앱은 서버 키로만 읽는다. 잠금 전 PRD 전문이 DB 에서 직접 새지 않게), 닉네임 40자 제한. SQL Editor 로 직접 적용한다.
   - Next.js 16.4.3(보안 패치)·zod 4.6.7, shadcn 은 devDependencies 로 옮김. 운영 의존성 알려진 취약점 0건(`npm audit --omit=dev`).
   - 이동 주소 검사 `safeNextPath`(lib/access.ts): 탭·줄바꿈·백슬래시가 든 주소는 받지 않고, 주소를 풀어 봐도 우리 사이트 안인지 확인. `/auth/password`·`/auth/signout` 은 다른 사이트에서 온 요청이면 403(`isCrossOrigin`).
   - 로그인·결제 실패 화면은 주소의 문구를 그대로 쓰지 않고 코드로 정해 둔 문구만 보여 준다(`LOGIN_ERRORS`, `FAIL_MESSAGES`).
   - 보안 헤더(`next.config.ts`): 액자 금지(X-Frame-Options·frame-ancestors), nosniff, Referrer-Policy, Permissions-Policy, X-Powered-By 숨김.
   - 확인: 개발 서버에서 헤더 5개, 위험한 next 주소 4종 → /projects, 다른 출처 로그인·로그아웃 403·같은 출처 정상, 가짜 문구 안 보임, 페이지 11개·API 응답 정상, tsc·lint·build 통과. **배포 후 실제 계정으로 로그인·로그아웃과 토스 결제창이 열리는지 한 번 확인할 것.**
   - 남은 일: 보고서 10장의 코드 2단계(비용 방어)·3단계(에러 알림, 크레딧 원장·환불, 탈퇴), 문서(처리방침·약관·SEO), 사장님 결정(요금제, 통신판매업, 도메인).
12. **보안 2단계: AI 비용 방어** (2026-10-28, 마이그레이션 `20261028200000_rate_limits.sql`)
   - 로그인 안 한 사용자: IP 기준 10분에 새 프로젝트 5개(`GUEST_PROJECTS_PER_10_MIN`)·대화 30턴(`GUEST_TURNS_PER_10_MIN`). 쿠키를 지우면 새 사람이 되므로 IP 로 센다. 로그인 사용자는 IP 로 막지 않는다(통신사·카페 와이파이는 IP 하나를 여럿이 같이 씀).
   - 로그인 계정: 하루(한국 시간 0시 기준) PRD 생성 10개(`PRD_PER_DAY`), 실패한 시도도 센다. 개발자 계정은 제외.
   - 세는 곳: `rate_limit_hits` 표 + `hit_rate_limit` 함수(시간 칸마다 원자적으로 +1), `lib/rate-limit.ts`. IP 는 비밀 키를 섞은 해시로만 저장하고, IPv6 는 앞 4칸(/64)으로 묶는다. 이틀 지난 기록은 함수가 가끔 지운다.
   - DB 확인에 실패하면 막지 않는다(제한 때문에 서비스가 멈추지 않게, 로그 `[rate-limit] check failed`). 그래서 마이그레이션을 적용하기 전에는 제한이 꺼진 상태다.
   - 확인: PGlite(PC 안 임시 Postgres)로 SQL 시험(5번 허용·6번째 거부, 하루 칸이 한국 0시, 권한, 두 번 실행), IP 묶기 8가지, tsc·lint·build, 개발 서버에서 적용 전 통과(fail-open)와 임시 프로젝트 삭제.
   - 적용 후 개발 서버: 쿠키를 지우며 새 아이디어 6개 → 6번째 429, 다른 IP(x-real-ip)는 통과, 대화 31번째 429(앞 30번은 AI 없이 '처리 중' 409 로 셈), 다른 IP 대화는 따로 셈. 시험 프로젝트는 모두 삭제. 하루 PRD 10개는 로그인이 필요해 같은 함수 시험으로 대신함.
13. **개인정보처리방침 보강** (2026-10-28, 초안 `../개인정보처리방침 초안 (2026-10-28).md` 승인 후 반영, 마이그레이션 `20261028300000_cleanup_expired_data.sql`)
   - `/privacy` 를 14장으로: 수집 항목 7종·수집 방법·처리 근거, 법정 보관(전자상거래법·통신비밀보호법), 제3자 미제공, 위탁과 국외 이전(회사별 연락처·항목·시기와 방법·목적·기간, 거부 방법), 파기, 권리 행사, 자동화된 결정, 쿠키 4종과 거부 방법, 안전성 확보 조치, 만 14세 미만, 보호책임자(대표, `lib/business.ts`), 권익침해 구제 4곳, 변경 공지. 시행일 2026-10-28.
   - "관리 계정 2단계 인증" 은 사용자가 실제로 켰다고 확인되면 10장 관리적 조치에 추가한다.
   - 보관 기간을 실제로 지키는 `cleanup_expired_data()`: 로그인 안 한 프로젝트는 마지막 이용(updated_at)으로부터 30일 뒤, 로그인 기록(auth.audit_log_entries)은 3개월 뒤 삭제. 새 프로젝트를 만들면 응답을 보낸 뒤(`after`) 하루 한 번 실행한다(`cleanup:daily` 키로 rate_limit_hits 재사용).
   - 바닥글·약관 사업자 정보에 호스팅 제공자(Vercel Inc.), 바닥글의 개인정보처리방침 링크는 진한 색으로 구분.
   - 확인: PGlite 로 정리 SQL 시험(30일 지난 게스트·3개월 지난 기록만 삭제, 로그인 기록 권한이 없어도 프로젝트 정리는 됨, 두 번 실행, 권한), tsc·lint·build, 개발 서버에서 14장·표·바닥글·약관 확인, 휴대폰 375px 가로 넘침 없음(국외 이전은 표 대신 회사별 목록으로).
14. **이용약관 보강과 AI 고지** (2026-10-28, 초안 `../이용약관 초안 (2026-10-28).md` 승인 후 반영)
   - `/terms` 를 17조+부칙으로: 약관 게시·변경(7일·30일 전 공지, 불리하면 이메일), 이용계약·만 14세 미만, 서비스 내용(무료 이용 한도), 생성형 AI 고지·생성물 권리, 결제·미성년자 결제 취소, 청약철회 제한(전자상거래법 제17조 제2항 제5호), 탈퇴, 회사·이용자 의무, 이용 제한, 서비스 종료 시 남은 크레딧 환불, 지식재산권, 손해배상·면책(고의·중과실 제외), 통지, 분쟁·관할. 시행일 2026-10-28.
   - 화면: 잠금 해제 확인 창 "사용한 크레딧은 환불되지 않아요."(굵게), 첫 화면 예시 아래 "MOMO는 생성형 AI예요. 질문과 문서는 AI가 만들어요.", 대화 말풍선 이름 "MOMO · AI", 결과 화면 머리 "Result · AI 생성 · 날짜". 내려받는 파일 안은 그대로(생성 문서는 바꾸지 않는다는 결정).
   - 확인: tsc·lint·build, 개발 서버에서 약관 17조·부칙·사업자 정보, 첫 화면 문구(데스크톱·375px 한 줄). 확인 창·결과 화면 머리·대화 이름은 로그인·AI 호출이 필요해 코드로만 확인 → **배포 후 실제 계정으로 볼 것.**
15. **SEO 기본** (2026-10-28, 공유 그림 시안 `../design-mockup/og-image.html` A 승인 후 반영)
   - `lib/site.ts`: 대표 주소 `SITE_URL`(Vercel 운영 도메인 `VERCEL_PROJECT_PRODUCTION_URL` 우선, 자체 도메인을 붙이면 자동으로 바뀜), 공유 기본값 `OPEN_GRAPH_BASE`·`TWITTER_BASE`, 공개 화면용 `publicPageMetadata`, 비공개 화면용 `PRIVATE_ROBOTS`.
   - `app/robots.ts`(/api/ /auth/ /admin /p/ 수집 막음 + sitemap 주소), `app/sitemap.ts`(홈·요금·약관·처리방침·환불).
   - 대표 주소(canonical)는 레이아웃에 넣으면 모든 화면이 홈을 가리키므로 공개 화면마다 넣는다. 화면별 openGraph 는 레이아웃 값을 통째로 바꾸므로 `OPEN_GRAPH_BASE` 를 펼쳐 쓴다(안 그러면 공유 그림이 빠짐).
   - 공유 그림은 `public/og.png`(1200×630, 시안 A 를 headless Chrome 으로 렌더). 그림을 바꾸면 파일 이름도 바꾼다(카카오톡 캐시).
   - 검색 제외(noindex): 로그인·크레딧(성공·실패)·내 프로젝트·결과 문서·대화. 개발자 도구는 원래 noindex.
   - 확인: 운영용 빌드(next start 3100)로 robots·sitemap·화면별 canonical·og:url·og:title·og:image·twitter:image, 비공개 화면 noindex.
   - 남은 일: 구글 서치 콘솔 sitemap 제출, 네이버 서치어드바이저 등록(인증 코드를 받으면 layout `verification.other` 에 `naver-site-verification` 추가).

## 알아 둘 것

- `.env.local` 은 git 에 올리지 않는다. 비밀 키(Supabase secret, Anthropic)는 이 파일에만 있다.
- 마이그레이션은 SQL Editor 로 직접 적용한다. 반드시 https://supabase.com/dashboard/project/nxejnobwhfhvkdytjxcm/sql/new 처럼 주소에 프로젝트 id 가 든 화면에서 실행하고, 적용 뒤 `to_regclass`·`has_table_privilege` 같은 확인 SQL 로 결과를 본다 (2026-10-28 에 다른 곳에 실행돼 적용이 늦어진 적 있음).
- `npm run dev` 는 `--use-system-ca` 로 실행된다. Avast 백신의 HTTPS 검사 때문에 Supabase 연결이 인증서 오류로 실패하던 문제를 막는다.
- 질문·문서 품질은 `lib/prompts/*.md` 만 고치면 된다 (개발 서버는 저장 즉시 반영).
- 테스트로 만든 프로젝트 "헬스장 출석 체크", "카페 스탬프"(리디자인 확인용, 질문 1개까지)가 DB 에 남아 있다(게스트 소유, 견본으로 사용 가능).
