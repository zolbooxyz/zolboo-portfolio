-- ============================================================================
-- Visitor "room of memories" guestbook
-- Run this once in your Supabase project (SQL editor).
--
-- Privacy design: `phone` is collected but must NEVER be readable by the public
-- anon key. So the base table has RLS enabled with NO select policy (anon cannot
-- read it at all), reads go through a phone-free VIEW, and inserts go through a
-- SECURITY DEFINER function (the anon role never touches the base table directly).
-- ============================================================================

create table if not exists public.memories (
  id         uuid primary key default gen_random_uuid(),
  nickname   text not null check (char_length(nickname) between 1 and 40),
  phone      text          check (phone is null or char_length(phone) <= 30),
  comment    text not null check (char_length(comment) between 1 and 1000),
  cube       int  not null,
  created_at timestamptz not null default now()
);

alter table public.memories enable row level security;
-- (no SELECT / INSERT policy for anon on the base table → phone stays private)

-- public, phone-free projection used for reads
create or replace view public.memories_public as
  select id, nickname, comment, cube, created_at
  from public.memories;

grant select on public.memories_public to anon, authenticated;

-- insert path: runs as the function owner, returns only the public columns
create or replace function public.add_memory(
  p_nickname text,
  p_phone    text,
  p_comment  text,
  p_cube     int
) returns public.memories_public
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.memories_public;
begin
  insert into public.memories (nickname, phone, comment, cube)
  values (
    trim(p_nickname),
    nullif(trim(coalesce(p_phone, '')), ''),
    trim(p_comment),
    p_cube
  )
  returning id, nickname, comment, cube, created_at into r;
  return r;
end;
$$;

grant execute on function public.add_memory(text, text, text, int) to anon, authenticated;

-- optional: enable realtime so other visitors' memories pop in live
-- alter publication supabase_realtime add table public.memories;
