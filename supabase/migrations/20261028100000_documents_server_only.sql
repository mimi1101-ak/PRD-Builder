-- 문서·대화는 서버만 읽는다 (2026-10-28, 런칭 보안 심사)
-- - PRD 미리보기(20261028000000) 뒤로 documents 에는 잠금 해제 전 PRD 전문이 들어 있다. 화면·API 는 앞 장만 보내지만,
--   로그인 사용자의 읽기 권한이 남아 있으면 브라우저에서 DB 를 직접 불러 전문을 읽을 수 있다.
-- - 앱은 documents·messages 를 서버(service_role)로만 읽는다 (lib/projects.ts). 그래서 로그인 사용자의 읽기 권한과 정책을 없앤다.
--   RLS 는 켜 둔 채 정책을 만들지 않는다 (credit_grants 와 같은 방식).
-- - 닉네임은 브라우저 키로 고칠 수 있는 유일한 칸이라 DB 에서도 40자로 막는다 (가입 트리거·로그인 콜백도 40자로 자른다).
-- 여러 번 실행해도 결과가 같다.

revoke select on public.documents, public.messages from authenticated;
drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "messages_select_own" on public.messages;

update public.profiles set nickname = left(nickname, 40) where char_length(nickname) > 40;
alter table public.profiles drop constraint if exists profiles_nickname_length;
alter table public.profiles
  add constraint profiles_nickname_length check (char_length(nickname) <= 40);

-- 되돌리기 (닉네임 제한만. 문서·대화 읽기 권한은 되돌리지 않는다 — 결제 전 PRD 전문이 다시 열린다)
-- alter table public.profiles drop constraint if exists profiles_nickname_length;
