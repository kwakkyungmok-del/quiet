create or replace function public.is_creator(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.id = _uid
      and lower(u.email) = 'kwak.kyungmok@gmail.com'
  );
$$;
