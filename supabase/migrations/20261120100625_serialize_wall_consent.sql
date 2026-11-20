-- Serialize publication with permission changes for the same family/player.
-- Consent records remain append-only. Never rewrite or infer existing choices.
create or replace function private.apply_image_consent_withdrawal() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.child_id is not null then
  perform pg_advisory_xact_lock(hashtextextended('image-consent:'||(select user_id::text from public.guardians where id=new.guardian_id)||':'||new.child_id::text,0));
 end if;
 if new.document_type='Autorización de imagen y vídeo' and new.child_id is not null
 and new.consent_options->>'portal_internal'='false' then
  update public.community_posts set status='rejected',published_at=null,
   moderation_note='Ocultada tras retirada de autorización de imagen.'
  where child_id=new.child_id and author_user_id=(select user_id from public.guardians where id=new.guardian_id)
  and media_path is not null and status<>'rejected';
 end if;
 return new;
end $$;

create or replace function private.require_wall_media_consent() returns trigger
language plpgsql security definer set search_path='' as $$
declare allowed boolean;
begin
 if new.media_path is not null and new.status='published' then
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
