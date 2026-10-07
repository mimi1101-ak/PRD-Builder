-- 무료 PRD 생성: "하루 3회" → "계정당 3개" (2026-10-07)
-- 인터뷰는 계속 무제한. 3개를 다 쓰면 더 만들 수 없다.

alter table public.profiles
  add column free_gen_total integer not null default 0 check (free_gen_total >= 0);

-- 이미 쓰던 계정은 지금 남아 있는 완성된 PRD 수부터 센다
update public.profiles p
   set free_gen_total = (
     select count(*)
       from public.documents d
       join public.projects pr on pr.id = d.project_id
      where pr.user_id = p.id
        and d.kind = 'prd'
        and d.status = 'ready'
   );

-- 하루 단위로 세던 칸은 더 쓰지 않는다
alter table public.profiles
  drop column free_gen_date,
  drop column free_gen_count;

-- 무료 PRD 생성 1회 사용. 계정당 p_limit개까지. 성공하면 true.
create or replace function public.consume_free_generation(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set free_gen_total = free_gen_total + 1
   where id = p_user_id
     and free_gen_total < p_limit;
  return found;
end;
$$;

-- 생성이 실패하면 사용 횟수를 돌려준다.
create or replace function public.refund_free_generation(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set free_gen_total = free_gen_total - 1
   where id = p_user_id and free_gen_total > 0;
end;
$$;
