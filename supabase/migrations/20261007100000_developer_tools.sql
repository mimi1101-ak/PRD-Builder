-- 개발자 도구 (2026-10-07)
-- - 개발자 계정(is_admin)은 무료 PRD·다시 쓰기 제한 없음, 잠금 해제 때 크레딧 차감 없음
-- - 개발자는 /admin 에서 다른 사용자에게 크레딧을 넣어 줄 수 있다 (넣기만, 빼기는 없음)
-- - is_admin 은 브라우저에서 바꿀 수 없다 (authenticated 는 nickname 컬럼만 수정 가능)

alter table public.profiles
  add column is_admin boolean not null default false;

-- 운영자 본인 계정 두 개만 개발자로 지정
update public.profiles p
   set is_admin = true
  from auth.users u
 where u.id = p.id
   and lower(u.email) in ('erin8751@gmail.com', 'erin8751@naver.com');

-- 크레딧 지급 기록
create table public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  granted_by uuid references auth.users (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  amount integer not null check (amount between 1 and 100),
  memo text check (char_length(memo) <= 100),
  created_at timestamptz not null default now()
);

create index credit_grants_created_idx on public.credit_grants (created_at desc);

-- 서버(service_role)만 읽고 쓴다: RLS 를 켜고 정책은 만들지 않는다
alter table public.credit_grants enable row level security;
revoke all on public.credit_grants from anon, authenticated;

-- 크레딧 넣어 주기: 개발자 확인 + 크레딧 추가 + 기록을 한 번에. 반환: 받은 사람의 새 크레딧 (실패하면 null)
create function public.grant_credits(p_admin_id uuid, p_user_id uuid, p_amount integer, p_memo text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credits integer;
begin
  if p_amount is null or p_amount < 1 or p_amount > 100 then
    return null;
  end if;
  perform 1 from public.profiles where id = p_admin_id and is_admin;
  if not found then
    return null;
  end if;

  update public.profiles set credits = credits + p_amount
   where id = p_user_id
  returning credits into v_credits;
  if not found then
    return null;
  end if;

  insert into public.credit_grants (granted_by, user_id, amount, memo)
  values (p_admin_id, p_user_id, p_amount, nullif(left(trim(coalesce(p_memo, '')), 100), ''));
  return v_credits;
end;
$$;

-- 이메일로 사용자 찾기 (auth.users 는 API 로 바로 못 읽으므로 함수로)
create function public.admin_find_user(p_email text)
returns table (
  id uuid,
  email text,
  nickname text,
  credits integer,
  provider text,
  created_at timestamptz,
  project_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id,
         u.email::text,
         p.nickname,
         p.credits,
         u.raw_app_meta_data ->> 'provider',
         u.created_at,
         (select count(*)::integer from public.projects pr where pr.user_id = u.id)
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(trim(p_email))
   order by u.created_at
   limit 5;
$$;

-- 최근 지급 내역 (받은 사람 이메일 포함)
create function public.admin_recent_grants(p_limit integer)
returns table (
  id uuid,
  email text,
  nickname text,
  amount integer,
  memo text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, u.email::text, p.nickname, g.amount, g.memo, g.created_at
    from public.credit_grants g
    left join auth.users u on u.id = g.user_id
    left join public.profiles p on p.id = g.user_id
   order by g.created_at desc
   limit least(greatest(p_limit, 1), 100);
$$;

-- 잠금 해제: 개발자 계정은 크레딧을 차감하지 않는다 (나머지는 이전과 같음)
create or replace function public.unlock_project(p_project_id uuid, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unlocked boolean;
begin
  select unlocked into v_unlocked
    from public.projects
   where id = p_project_id and user_id = p_user_id
   for update;
  if not found then
    return 'not_found';
  end if;
  if v_unlocked then
    return 'already';
  end if;

  perform 1 from public.profiles where id = p_user_id and is_admin;
  if not found then
    update public.profiles set credits = credits - 1
     where id = p_user_id and credits > 0;
    if not found then
      return 'no_credit';
    end if;
  end if;

  update public.projects set unlocked = true, updated_at = now()
   where id = p_project_id;
  return 'unlocked';
end;
$$;

revoke execute on function public.grant_credits(uuid, uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.admin_find_user(text) from public, anon, authenticated;
revoke execute on function public.admin_recent_grants(integer) from public, anon, authenticated;
revoke execute on function public.unlock_project(uuid, uuid) from public, anon, authenticated;

grant execute on function public.grant_credits(uuid, uuid, integer, text) to service_role;
grant execute on function public.admin_find_user(text) to service_role;
grant execute on function public.admin_recent_grants(integer) to service_role;
grant execute on function public.unlock_project(uuid, uuid) to service_role;
