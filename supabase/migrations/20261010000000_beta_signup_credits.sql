-- 베타 테스트 기간: 가입(첫 로그인)하면 크레딧 3건 무료 지급 (2026-10-10)
-- 프로필은 가입 트리거(handle_new_user)와 로그인 콜백(upsert)에서 credits 를 넣지 않고 만들기 때문에
-- 기본값만 바꾸면 두 곳 모두 3건으로 시작한다. 이미 가입한 계정은 바뀌지 않는다.
-- 베타가 끝나면: alter table public.profiles alter column credits set default 0;

alter table public.profiles alter column credits set default 3;
