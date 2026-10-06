-- 질문형 PRD 생성기 — 초기 스키마 (docs/PRD.md 6장)
--
-- 원칙
-- - 테이블 5개: profiles, projects, messages, documents, payments
-- - 모든 테이블 RLS(행 단위 보안) 켜기: 로그인한 사용자는 자기 데이터만 "읽기" 가능
-- - 쓰기(크레딧·결제·문서·대화)는 서버(service_role)에서만. 브라우저 키로는 닉네임만 수정 가능
-- - 크레딧이 바뀌는 작업은 모두 아래 SQL 함수 안에서 한 번에(원자적으로) 처리

-- ─────────────────────────────────────────────
-- 1. 테이블
-- ─────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text,
  credits integer not null default 0 check (credits >= 0),
  -- 무료 PRD 생성 하루 3회 제한용 (한국 시간 기준 날짜)
  free_gen_date date,
  free_gen_count integer not null default 0 check (free_gen_count >= 0),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  -- 로그인 전에는 user_id 없이 guest_token(브라우저 쿠키)으로 주인을 구분하고,
  -- 로그인하는 순간 user_id로 옮긴다.
  user_id uuid references auth.users (id) on delete cascade,
  guest_token uuid,
  title text,
  idea text not null check (char_length(idea) between 1 and 2000),
  tool text not null default 'claude_code',
  experience text,
  status text not null default 'interviewing'
    check (status in ('interviewing', 'final_check', 'done')),
  coverage jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_owner_present check (user_id is not null or guest_token is not null)
);

create index projects_user_created_idx on public.projects (user_id, created_at desc);
create index projects_guest_idx on public.projects (guest_token) where guest_token is not null;

create table public.messages (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  role text not null check (role in ('ai', 'user')),
  content text not null,
  options jsonb not null default '[]'::jsonb,
  phase text not null default 'interview' check (phase in ('interview', 'final_check')),
  created_at timestamptz not null default now()
);

create index messages_project_id_idx on public.messages (project_id, id);
create index messages_project_created_idx on public.messages (project_id, created_at);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('prd', 'tasks', 'claude_md')),
  content text not null default '',
  -- generating: 생성 중(중복 생성 방지 잠금) / ready: 완료 / failed: 실패
  status text not null default 'ready' check (status in ('generating', 'ready', 'failed')),
  rewrite_count integer not null default 0 check (rewrite_count >= 0),
  updated_at timestamptz not null default now(),
  unique (project_id, kind)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  -- 결제 기록은 법적 보관 대상이므로 회원이 삭제돼도 행은 남긴다.
  user_id uuid references auth.users (id) on delete set null,
  order_id text not null unique, -- 고유 제약으로 같은 주문의 중복 처리 방지
  product text not null check (product in ('credit_1', 'credit_5')),
  amount integer not null check (amount > 0),
  credits_added integer not null check (credits_added > 0),
  status text not null default 'ready' check (status in ('ready', 'done', 'failed', 'canceled')),
  toss_payment_key text unique,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_user_created_idx on public.payments (user_id, created_at desc);

-- ─────────────────────────────────────────────
-- 2. RLS — 자기 데이터만 읽기
-- ─────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.payments enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "projects_select_own" on public.projects
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "messages_select_own" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = messages.project_id and p.user_id = (select auth.uid())
  ));

create policy "documents_select_own" on public.documents
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = documents.project_id and p.user_id = (select auth.uid())
  ));

create policy "payments_select_own" on public.payments
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- 테이블 권한: 브라우저(anon/authenticated)는 읽기만, profiles는 nickname 컬럼만 수정 가능.
-- credits·unlocked 같은 컬럼은 브라우저에서 절대 바꿀 수 없다.
revoke all on public.profiles, public.projects, public.messages, public.documents, public.payments from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.profiles, public.projects, public.messages, public.documents, public.payments
  from authenticated;
grant select on public.profiles, public.projects, public.messages, public.documents, public.payments to authenticated;
grant update (nickname) on public.profiles to authenticated;

-- ─────────────────────────────────────────────
-- 3. 가입 시 프로필 자동 생성 (무료 크레딧 없음: credits 기본값 0)
-- ─────────────────────────────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '메이커'
    ), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- 4. 서버 전용 함수 (service_role만 실행 가능)
-- ─────────────────────────────────────────────

-- 무료 PRD 생성 1회 사용. 한국 시간 하루 p_limit회까지. 성공하면 true.
create function public.consume_free_generation(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  update public.profiles
     set free_gen_count = case when free_gen_date = v_today then free_gen_count + 1 else 1 end,
         free_gen_date = v_today
   where id = p_user_id
     and (free_gen_date is distinct from v_today or free_gen_count < p_limit);
  return found;
end;
$$;

-- 생성이 실패하면 사용 횟수를 돌려준다.
create function public.refund_free_generation(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  update public.profiles
     set free_gen_count = free_gen_count - 1
   where id = p_user_id and free_gen_date = v_today and free_gen_count > 0;
end;
$$;

-- 프로젝트 잠금 해제: 크레딧 1 차감 + unlocked=true 를 한 번에.
-- 반환: 'unlocked' | 'already' | 'no_credit' | 'not_found'
create function public.unlock_project(p_project_id uuid, p_user_id uuid)
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

  update public.profiles set credits = credits - 1
   where id = p_user_id and credits > 0;
  if not found then
    return 'no_credit';
  end if;

  update public.projects set unlocked = true, updated_at = now()
   where id = p_project_id;
  return 'unlocked';
end;
$$;

-- 결제 승인 완료 처리: 같은 주문은 딱 한 번만 크레딧을 지급한다(행 잠금 + status 조건).
create function public.complete_payment(p_order_id text, p_payment_key text, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_credits integer;
begin
  update public.payments
     set status = 'done', toss_payment_key = p_payment_key, approved_at = now()
   where order_id = p_order_id
     and status in ('ready', 'failed')
     and amount = p_amount
  returning user_id, credits_added into v_user, v_credits;

  if not found then
    return jsonb_build_object('granted', false);
  end if;

  update public.profiles set credits = credits + v_credits where id = v_user;
  return jsonb_build_object('granted', true, 'credits_added', v_credits);
end;
$$;

-- 문서 생성 잠금: 같은 문서를 동시에 두 번 만들지 않게 한다. 잠금을 얻으면 true.
-- 5분 넘게 'generating'인 행은 실패한 것으로 보고 다시 잠글 수 있다.
create function public.start_document_generation(p_project_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.documents (project_id, kind, status, updated_at)
  values (p_project_id, p_kind, 'generating', now())
  on conflict (project_id, kind) do update
     set status = 'generating', updated_at = now()
   where public.documents.status <> 'generating'
      or public.documents.updated_at < now() - interval '5 minutes';
  return found;
end;
$$;

-- 섹션 다시 쓰기 반영: 프로젝트(크레딧 1건)당 p_limit회까지.
create function public.apply_rewrite(p_project_id uuid, p_kind text, p_content text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used integer;
begin
  perform 1 from public.projects
   where id = p_project_id and unlocked
   for update;
  if not found then
    return false;
  end if;

  select coalesce(sum(rewrite_count), 0) into v_used
    from public.documents where project_id = p_project_id;
  if v_used >= p_limit then
    return false;
  end if;

  update public.documents
     set content = p_content, rewrite_count = rewrite_count + 1, updated_at = now()
   where project_id = p_project_id and kind = p_kind and status = 'ready';
  return found;
end;
$$;

-- 분당 요청 제한용: 최근 p_seconds초 동안 이 사용자(또는 게스트)의 대화 메시지 수.
create function public.count_recent_messages(p_user_id uuid, p_guest_token uuid, p_seconds integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.messages m
    join public.projects p on p.id = m.project_id
   where m.created_at > now() - make_interval(secs => p_seconds)
     and ((p_user_id is not null and p.user_id = p_user_id)
       or (p_guest_token is not null and p.guest_token = p_guest_token));
$$;

-- 함수 실행 권한: 서버(service_role)만.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.consume_free_generation(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_free_generation(uuid) from public, anon, authenticated;
revoke execute on function public.unlock_project(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.complete_payment(text, text, integer) from public, anon, authenticated;
revoke execute on function public.start_document_generation(uuid, text) from public, anon, authenticated;
revoke execute on function public.apply_rewrite(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.count_recent_messages(uuid, uuid, integer) from public, anon, authenticated;

grant execute on function public.consume_free_generation(uuid, integer) to service_role;
grant execute on function public.refund_free_generation(uuid) to service_role;
grant execute on function public.unlock_project(uuid, uuid) to service_role;
grant execute on function public.complete_payment(text, text, integer) to service_role;
grant execute on function public.start_document_generation(uuid, text) to service_role;
grant execute on function public.apply_rewrite(uuid, text, text, integer) to service_role;
grant execute on function public.count_recent_messages(uuid, uuid, integer) to service_role;
