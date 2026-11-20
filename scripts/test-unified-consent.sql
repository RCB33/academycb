\set ON_ERROR_STOP on
begin;
create role anon;create role authenticated;
create schema private;
create table guardians(id uuid primary key,user_id uuid);
create table signatures(id uuid primary key default gen_random_uuid(),guardian_id uuid,child_id uuid,document_type text,consent_options jsonb,signed_at timestamptz default clock_timestamp());
create table community_posts(id uuid primary key default gen_random_uuid(),author_user_id uuid,child_id uuid,media_path text,status text,published_at timestamptz,moderation_note text,visibility text);
\ir ../supabase/migrations/20261120100447_unified_family_consent.sql
\ir ../supabase/migrations/20261120100625_serialize_wall_consent.sql
do $$ declare u uuid:=gen_random_uuid();g uuid:=gen_random_uuid();c uuid:=gen_random_uuid();other_child uuid:=gen_random_uuid();post uuid;blocked boolean:=false;
begin
 insert into guardians values(g,u);
 begin insert into community_posts(author_user_id,child_id,media_path,status) values(u,c,'x.png','published');exception when raise_exception then blocked:=true;end;
 if not blocked then raise exception 'Missing consent accepted';end if;
 insert into signatures(guardian_id,child_id,document_type,consent_options) values(g,c,'Autorización de imagen y vídeo','{"portal_internal":true,"public_communications":false}');
 insert into community_posts(author_user_id,child_id,media_path,status,visibility) values(u,c,'x.png','published','private') returning id into post;
 if (select visibility from community_posts where id=post)<>'private' then raise exception 'Visibility broadened';end if;
 blocked:=false;
 begin insert into community_posts(author_user_id,child_id,media_path,status) values(u,other_child,'x.png','published');exception when raise_exception then blocked:=true;end;
 if not blocked then raise exception 'Another child inherited consent';end if;
 insert into signatures(guardian_id,child_id,document_type,consent_options) values(g,c,'Autorización de imagen y vídeo','{"portal_internal":false,"public_communications":true}');
 if (select status from community_posts where id=post)<>'rejected' then raise exception 'Withdrawal did not hide media';end if;
 blocked:=false;begin update community_posts set status='published' where id=post;exception when raise_exception then blocked:=true;end;
 if not blocked then raise exception 'Withdrawal bypassed';end if;
 insert into community_posts(author_user_id,child_id,status) values(u,c,'published');
 if (select count(*) from signatures)<>2 then raise exception 'History changed';end if;
 raise notice 'PASS consent absent/foreign child/refusal blocks images, private visibility preserved, withdrawal atomic, republish blocked, text allowed, history preserved';
end $$;
rollback;
