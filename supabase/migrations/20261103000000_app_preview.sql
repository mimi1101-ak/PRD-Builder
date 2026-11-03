-- 화면 미리보기 (2026-11-03)
-- - PRD 를 만든 뒤, 크레딧 1건으로 이 서비스의 화면 네 개(홈·요금·기능·결과)를 가짜 데이터로 그려 본다.
-- - 문서 잠금 해제(unlock_project)와는 따로 차감한다. 개발자 계정은 차감하지 않는다.
-- - 크레딧은 생성에 성공해 저장하는 순간에만 차감한다 (complete_preview 안에서 저장과 함께).
-- - 서버(service_role)만 읽고 쓴다: RLS 를 켜고 정책은 만들지 않는다 (documents 와 같은 방식).

create table public.previews (
  project_id uuid primary key references public.projects (id) on delete cascade,
  -- AI 가 채운 화면 글과 가짜 데이터 (lib/preview.ts 의 AppPreview)
  content jsonb,
  -- generating: 만드는 중(중복 생성 방지 잠금) / ready: 완료 / failed: 실패
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  -- 실제로 크레딧을 썼는지 (개발자 계정은 false). 환불 문의 때 확인용
  credit_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.previews enable row level security;
revoke all on public.previews from anon, authenticated;

-- 생성 잠금: 같은 미리보기를 동시에 두 번 만들지 않는다. 잠금을 얻으면 true.
-- 이미 완성된 미리보기는 다시 잠그지 않고, 5분 넘게 'generating'인 행은 실패한 것으로 본다.
create function public.start_preview_generation(p_project_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.previews (project_id, status, updated_at)
  values (p_project_id, 'generating', now())
  on conflict (project_id) do update
     set status = 'generating', updated_at = now()
   where public.previews.status = 'failed'
      or (public.previews.status = 'generating' and public.previews.updated_at < now() - interval '5 minutes');
  return found;
end;
$$;

-- 미리보기 저장 + 크레딧 1 차감을 한 번에.
-- 반환: 'ready' | 'already' | 'no_credit' | 'not_found'
create function public.complete_preview(p_project_id uuid, p_user_id uuid, p_content jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_charge boolean;
begin
  perform 1 from public.projects where id = p_project_id and user_id = p_user_id;
  if not found then
    return 'not_found';
  end if;

  select status into v_status
    from public.previews
   where project_id = p_project_id
   for update;
  if not found then
    return 'not_found';
  end if;
  if v_status = 'ready' then
    return 'already';
  end if;

  perform 1 from public.profiles where id = p_user_id and is_admin;
  v_charge := not found;
  if v_charge then
    update public.profiles set credits = credits - 1
     where id = p_user_id and credits > 0;
    if not found then
      return 'no_credit';
    end if;
  end if;

  update public.previews
     set content = p_content, status = 'ready', credit_used = v_charge, updated_at = now()
   where project_id = p_project_id;
  return 'ready';
end;
$$;

revoke execute on function public.start_preview_generation(uuid) from public, anon, authenticated;
revoke execute on function public.complete_preview(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.start_preview_generation(uuid) to service_role;
grant execute on function public.complete_preview(uuid, uuid, jsonb) to service_role;
