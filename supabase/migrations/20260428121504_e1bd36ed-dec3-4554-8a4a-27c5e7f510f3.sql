
-- profiles: 가입 시 자동 부여되는 캐릭터
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  character_name text not null unique,
  color text not null,
  noun text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "anyone authenticated can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- 캐릭터 이름 자동 생성 함수
create or replace function public.generate_character_name()
returns table(character_name text, color text, noun text)
language plpgsql
as $$
declare
  colors text[] := array['푸른','붉은','노란','초록','보라','검은','하얀','은빛','금빛','잿빛','분홍','주황','청록','남빛','연보라','진홍','연두','새벽','황혼','심해'];
  nouns text[] := array['등대','모래','구름','파도','바람','달빛','별자리','안개','눈송이','이끼','산호','나침반','종이배','유리병','촛불','거울','깃털','이슬','조약돌','메아리','선인장','고래','여우','부엉이','담쟁이','오로라','수정','피아노','만년필','종소리'];
  c text;
  n text;
  full_name text;
  attempt int := 0;
begin
  loop
    c := colors[1 + floor(random() * array_length(colors,1))::int];
    n := nouns[1 + floor(random() * array_length(nouns,1))::int];
    full_name := c || ' ' || n;
    if not exists (select 1 from public.profiles p where p.character_name = full_name) then
      return query select full_name, c, n;
      return;
    end if;
    attempt := attempt + 1;
    if attempt > 50 then
      full_name := c || ' ' || n || ' ' || floor(random()*9999)::text;
      return query select full_name, c, n;
      return;
    end if;
  end loop;
end;
$$;

-- 가입 시 프로필 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gen record;
begin
  select * into gen from public.generate_character_name();
  insert into public.profiles (id, character_name, color, noun)
  values (new.id, gen.character_name, gen.color, gen.noun);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

create policy "anyone can view rooms"
  on public.rooms for select
  using (true);

insert into public.rooms (slug, name, description) values
  ('free','자유','아무 이야기나 자유롭게'),
  ('hobby','취미','좋아하는 것들에 대해'),
  ('worry','고민','조용히 털어놓는 곳'),
  ('music','음악','지금 듣는 노래'),
  ('movie','영화','본 것, 보고 싶은 것'),
  ('midnight','심야','잠 못 드는 밤');

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index messages_room_created_idx on public.messages(room_id, created_at desc);

alter table public.messages enable row level security;

create policy "authenticated can view messages"
  on public.messages for select
  to authenticated
  using (true);

create policy "authenticated can send messages as self"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "users can delete own messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = sender_id);

-- whispers (1:1 귓속말)
create table public.whispers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index whispers_pair_idx on public.whispers(sender_id, recipient_id, created_at desc);
create index whispers_recipient_idx on public.whispers(recipient_id, created_at desc);

alter table public.whispers enable row level security;

create policy "users can view their whispers"
  on public.whispers for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "users can send whispers as self"
  on public.whispers for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.whispers;
