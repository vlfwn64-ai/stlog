-- ST LOG 관리자 화면용 (Supabase › SQL Editor에서 한 번 실행)
-- 1) 관리자 명단: 아무도 직접 읽거나 쓸 수 없음 (정책 없음). 명단 추가는 SQL Editor에서만.
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;

-- 2) 지금 로그인한 계정이 관리자인지
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- 3) 관리자만: 사용자 전체 + 기록 (관리자가 아니면 오류)
create or replace function public.admin_users()
returns table (user_id uuid, email text, provider text, created_at timestamptz, updated_at timestamptz, data jsonb)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not admin';
  end if;
  return query
    select u.id, u.email::text, (u.raw_app_meta_data ->> 'provider')::text, u.created_at, d.updated_at, d.data
    from auth.users u
    left join public.user_data d on d.user_id = u.id
    order by d.updated_at desc nulls last;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_users() to authenticated;

-- ───────── 관리자 명단 관리 (필요할 때 SQL Editor에서) ─────────
-- 새 관리자 추가: 그 사람이 앱에 한 번 로그인한 뒤, 이메일로
-- insert into public.admins (user_id) select id from auth.users where email = '새관리자@이메일';
-- (카카오라 이메일이 없으면 Authentication › Users에서 UID 복사)
-- insert into public.admins (user_id) values ('UID');

-- 지금 관리자 목록
-- select a.user_id, u.email, u.raw_app_meta_data ->> 'provider' as 로그인, u.created_at
-- from public.admins a join auth.users u on u.id = a.user_id;

-- 관리자 빼기
-- delete from public.admins where user_id = (select id from auth.users where email = '뺄사람@이메일');
