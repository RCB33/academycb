-- Keep the three communication channels separate: WhatsApp, email and the
-- authenticated Portal Familias. Historic broadcast rows are WhatsApp rows.
alter table public.broadcast_logs
  add column if not exists channel text not null default 'whatsapp',
  add column if not exists target_scope text not null default 'category';

alter table public.broadcast_logs
  drop constraint if exists broadcast_logs_channel_check,
  drop constraint if exists broadcast_logs_target_scope_check;

alter table public.broadcast_logs
  add constraint broadcast_logs_channel_check
    check (channel in ('whatsapp', 'email', 'portal')),
  add constraint broadcast_logs_target_scope_check
    check (target_scope in ('all', 'category', 'team'));

create index if not exists broadcast_logs_channel_created_at_idx
  on public.broadcast_logs (channel, created_at desc);
