-- Планер: настройка базы данных Supabase.
-- Запускается один раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен.
--
-- Одна универсальная таблица records хранит все данные планера (задачи, сферы, привычки…).
-- Поле kind говорит, что это за запись, поле data — её содержимое.
-- Поэтому при добавлении новых функций базу менять не нужно.

create table if not exists public.records (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind              text not null,
  data              jsonb not null default '{}'::jsonb,
  updated_at        timestamptz not null,   -- когда запись изменили на устройстве
  deleted           boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp()  -- когда запись дошла до сервера
);

create index if not exists records_user_server_updated_idx
  on public.records (user_id, server_updated_at);

-- Безопасность: каждый пользователь видит и меняет только свои записи (Row Level Security).
alter table public.records enable row level security;

drop policy if exists "records: read own" on public.records;
drop policy if exists "records: insert own" on public.records;
drop policy if exists "records: update own" on public.records;

create policy "records: read own" on public.records
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "records: insert own" on public.records
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "records: update own" on public.records
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Удаления «мягкие» (deleted = true), поэтому права на DELETE нет ни у кого из браузера.
revoke all on public.records from anon;
revoke all on public.records from authenticated;
grant select, insert, update on public.records to authenticated;

-- Перед записью: ставим серверное время и не даём старой версии затереть более новую.
create or replace function public.records_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id then
      raise exception 'user_id нельзя менять';
    end if;
    if new.updated_at < old.updated_at then
      return old;  -- пришла устаревшая версия — оставляем как было
    end if;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists records_before_write on public.records;
create trigger records_before_write
  before insert or update on public.records
  for each row execute function public.records_before_write();
