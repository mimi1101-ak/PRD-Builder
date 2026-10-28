-- 남용 방지 횟수 제한 (2026-10-28, 런칭 보안 심사: AI 비용 폭주 막기)
-- - 로그인 안 한 사용자: IP 기준 10분에 새 프로젝트 5개·대화 30턴 (쿠키를 지우면 새 사람이 되므로 IP 로 센다)
-- - 로그인 사용자: 하루(한국 시간)에 PRD 생성 10개. 개발자 계정은 제외
-- - 숫자는 코드(lib/domain.ts)가 정하고, 여기서는 정해진 시간 칸마다 횟수를 원자적으로 센다 (lib/rate-limit.ts 가 부른다)
-- - IP 는 그대로 저장하지 않는다. 서버가 비밀 키를 섞어 만든 해시만 key 에 들어온다. 이틀 지난 기록은 지운다.
-- 여러 번 실행해도 결과가 같다.

create table if not exists public.rate_limit_hits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (key, window_start)
);

create index if not exists rate_limit_hits_window_idx on public.rate_limit_hits (window_start);

-- 서버(service_role)만 읽고 쓴다: RLS 를 켜고 정책은 만들지 않는다
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- 한 번 센다: 지금 시간 칸(p_window 단위, 한국 시간 0시 기준)의 횟수를 1 올리고 p_limit 이하면 true(허용)
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+09');
  v_hits integer;
begin
  insert into public.rate_limit_hits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- 가끔(약 100번에 1번) 이틀 지난 기록을 지운다
  if random() < 0.01 then
    delete from public.rate_limit_hits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function public.hit_rate_limit(text, integer, interval) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, interval) to service_role;

-- 되돌리기: drop function if exists public.hit_rate_limit(text, integer, interval); drop table if exists public.rate_limit_hits;
