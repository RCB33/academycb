-- Image and video use is a decision made independently for each child. The
-- signed snapshot is retained, so a later withdrawal never overwrites the
-- evidence of the former decision.
alter table public.signatures
  add column if not exists consent_options jsonb not null default '{}'::jsonb;

create index if not exists signatures_child_document_signed_idx
  on public.signatures(child_id, document_type, signed_at desc)
  where child_id is not null;

-- A guardian may only sign a child-specific document for a child they are
-- actually linked to. Administrators keep their existing read access.
drop policy if exists "signatures_guardian_insert" on public.signatures;
create policy "signatures_guardian_insert" on public.signatures
  for insert to authenticated
  with check (
    exists (
      select 1 from public.guardians g
      where g.id = signatures.guardian_id
        and g.user_id = (select auth.uid())
    )
    and (
      signatures.child_id is null
      or exists (
        select 1 from public.child_guardians cg
        where cg.child_id = signatures.child_id
          and cg.guardian_id = signatures.guardian_id
      )
    )
  );
