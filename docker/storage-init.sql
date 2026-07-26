insert into storage.buckets (id, name, public, file_size_limit)
values ('photos', 'photos', true, 104857600)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "photos_read" on storage.objects;
create policy "photos_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'photos');

drop policy if exists "photos_insert" on storage.objects;
create policy "photos_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'photos');
