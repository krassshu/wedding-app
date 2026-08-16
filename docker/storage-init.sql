insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  94371840,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'image/heif', 'image/avif', 'image/tiff', 'image/bmp', 'video/mp4',
    'video/quicktime', 'video/webm', 'video/ogg', 'video/x-msvideo',
    'video/x-matroska', 'video/3gpp'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos_read" on storage.objects;
create policy "photos_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'photos');

drop policy if exists "photos_insert" on storage.objects;
create policy "photos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'photos'
  and name = coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'upload_path',
    current_setting('request.jwt.claim.upload_path', true)
  )
  and name like 'gallery/%'
);
