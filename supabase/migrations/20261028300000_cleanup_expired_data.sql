-- 보관 기간이 지난 데이터 정리 (2026-10-28, 개인정보처리방침 1·2장)
-- - 로그인하지 않고 만든 프로젝트: 마지막 이용(updated_at)으로부터 30일이 지나면 삭제 (대화·문서도 함께 지워진다)
-- - 로그인 기록(auth.audit_log_entries): 통신비밀보호법에 따라 3개월 보관한 뒤 삭제
-- - 서버가 하루 한 번(새 프로젝트를 만들 때 응답을 보낸 뒤) 부른다. SQL Editor 에서 select public.cleanup_expired_data(); 로 직접 돌려도 된다.
-- 여러 번 실행해도 결과가 같다.

create or replace function public.cleanup_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_projects integer;
  v_logs integer;
  v_log_error text;
begin
  delete from public.projects
   where user_id is null
     and updated_at < now() - interval '30 days';
  get diagnostics v_projects = row_count;

  -- 로그인 기록은 Supabase 가 관리하는 표라 권한이 막혀 있을 수 있다. 실패해도 프로젝트 정리는 그대로 남긴다.
  begin
    delete from auth.audit_log_entries where created_at < now() - interval '3 months';
    get diagnostics v_logs = row_count;
  exception when others then
    v_log_error := sqlerrm;
  end;

  return jsonb_build_object(
    'guest_projects_deleted', v_projects,
    'login_logs_deleted', v_logs,
    'login_logs_error', v_log_error
  );
end;
$$;

revoke execute on function public.cleanup_expired_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_data() to service_role;

-- 되돌리기: drop function if exists public.cleanup_expired_data();
