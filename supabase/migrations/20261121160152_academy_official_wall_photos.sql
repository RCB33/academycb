create or replace function private.require_wall_media_consent() returns trigger
language plpgsql security definer set search_path='' as $$
declare allowed boolean;
begin
 if new.media_path is not null and new.status='published' then
  -- Official Academy posts are authored by an active administrator, with no
  -- child record. Family/player posts retain the existing consent check.
  if new.child_id is null and new.author_user_id=auth.uid()
    and public.has_role(array['admin']::text[]) then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('image-consent:'||new.author_user_id::text||':'||new.child_id::text,0));
  select s.consent_options->>'portal_internal'='true' into allowed
  from public.signatures s join public.guardians g on g.id=s.guardian_id
  where g.user_id=new.author_user_id and s.child_id=new.child_id
   and s.document_type='Autorización de imagen y vídeo'
  order by s.signed_at desc,s.id desc limit 1;
  if allowed is distinct from true then raise exception 'Revisa el permiso de imagen de este jugador antes de publicar.';end if;
 end if;
 return new;
end $$;

revoke all on function private.require_wall_media_consent() from public,anon,authenticated;
