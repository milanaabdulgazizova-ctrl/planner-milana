-- Планер: хранилище картинок (стикеры и мудборд).
-- Запускается один раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен.
--
-- Картинки лежат в закрытом хранилище «planner». У каждого пользователя своя папка
-- (её имя — id пользователя), и правила ниже разрешают работать только со своей папкой.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('planner', 'planner', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "planner files: read own" on storage.objects;
drop policy if exists "planner files: insert own" on storage.objects;
drop policy if exists "planner files: update own" on storage.objects;
drop policy if exists "planner files: delete own" on storage.objects;

create policy "planner files: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'planner' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "planner files: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'planner' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "planner files: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'planner' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'planner' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "planner files: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'planner' and (storage.foldername(name))[1] = (select auth.uid())::text);
