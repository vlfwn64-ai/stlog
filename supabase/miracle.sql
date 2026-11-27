-- ST LOG 미라클 티어 (관리자가 주는 특별 티어). admin.sql 다음에 한 번 실행.
-- 1) 미라클 명단: 본인 것만 읽을 수 있고, 쓰기는 관리자 함수로만
create table if not exists public.miracle (
  user_id uuid primary key references auth.users on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.miracle enable row level security;
drop policy if exists "read own miracle" on public.miracle;
create policy "read own miracle" on public.miracle for select using (auth.uid() = user_id);
grant select on public.miracle to authenticated;

-- 2) 관리자만: 미라클 주기·빼기
create or replace function public.admin_set_miracle(target uuid, on_ boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  if on_ then
    insert into public.miracle (user_id) values (target) on conflict (user_id) do nothing;
  else
    delete from public.miracle where user_id = target;
  end if;
end; $$;
revoke all on function public.admin_set_miracle(uuid, boolean) from public, anon;
grant execute on function public.admin_set_miracle(uuid, boolean) to authenticated;

-- 3) 관리자 목록에 미라클 여부도 (돌려주는 칸이 바뀌어서 지우고 다시 만든다)
drop function if exists public.admin_users();
create function public.admin_users()
returns table (user_id uuid, email text, provider text, created_at timestamptz, updated_at timestamptz, data jsonb, miracle boolean)
language plpgsql security definer set search_path = public, auth stable as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return query
    select u.id, u.email::text, (u.raw_app_meta_data ->> 'provider')::text, u.created_at, d.updated_at, d.data,
           exists (select 1 from public.miracle m where m.user_id = u.id)
    from auth.users u left join public.user_data d on d.user_id = u.id
    order by d.updated_at desc nulls last;
end; $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;
