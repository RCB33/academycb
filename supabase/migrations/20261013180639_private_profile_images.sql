-- Existing files and stored URLs are retained. The app serves them after record-level authorization.
update storage.buckets set public=false where id='profile_images';
drop policy if exists academy_profile_images_public_read on storage.objects;
create policy academy_profile_images_private_read on storage.objects as restrictive for select to anon,authenticated
using (bucket_id <> 'profile_images' or (auth.uid() is not null and public.is_admin()));
