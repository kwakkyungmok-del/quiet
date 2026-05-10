-- 1) Extend profiles with self-intro fields
alter table public.profiles
  add column if not exists hobbies text,
  add column if not exists personality text,
  add column if not exists bio text,
  add column if not exists favorites text,
  add column if not exists vibe text;

-- 2) Creator detection helper (security definer to read auth.users safely)
create or replace function public.is_creator(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users u
    where u.id = _uid
      and lower(u.email) = 'kwak.kyungmok@gmail.com'
  );
$$;

revoke execute on function public.is_creator(uuid) from public, anon;
grant execute on function public.is_creator(uuid) to authenticated;

-- 3) Creator-only read policies (additive; existing policies untouched)
drop policy if exists "creator can view all messages" on public.messages;
create policy "creator can view all messages"
on public.messages for select
to authenticated
using (public.is_creator(auth.uid()));

drop policy if exists "creator can view all whispers" on public.whispers;
create policy "creator can view all whispers"
on public.whispers for select
to authenticated
using (public.is_creator(auth.uid()));
