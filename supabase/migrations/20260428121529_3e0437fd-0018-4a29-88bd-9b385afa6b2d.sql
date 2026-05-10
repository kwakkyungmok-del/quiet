
alter function public.generate_character_name() set search_path = public;
revoke execute on function public.generate_character_name() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
