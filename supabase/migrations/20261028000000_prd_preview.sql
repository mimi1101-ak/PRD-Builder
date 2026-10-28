-- PRD 미리보기 (2026-10-28)
-- - 인터뷰·PRD 생성은 무제한 무료. 잠금 해제(크레딧 1건) 전에는 PRD 앞 3장만 보여 주고,
--   잠금 해제하면 PRD 나머지 + 작업 단계 + CLAUDE.md 가 함께 열린다 (화면·API 에서 처리).
-- - 무료 PRD 계정당 3개 제한은 코드에서 더 부르지 않는다
--   (consume_free_generation·refund_free_generation 함수와 profiles.free_gen_total 칸은 남겨 둔다).
-- - 베타 가입 크레딧 끝: 새로 가입하면 0건으로 시작한다. 이미 받은 크레딧은 그대로 둔다.

-- 이 변경 전에 무료로 받은 PRD 는 잠금 해제 없이도 계속 전체를 보여 준다
alter table public.projects
  add column prd_free boolean not null default false;

update public.projects p
   set prd_free = true
 where exists (
   select 1 from public.documents d
    where d.project_id = p.id
      and d.kind = 'prd'
      and d.status = 'ready'
 );

alter table public.profiles alter column credits set default 0;
