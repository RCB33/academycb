-- Approved public catalogue only. Does not open registration or create payment records.
begin;
do $$
declare
  before_digest text;
  after_digest text;
  changed integer;
begin
  select md5(string_agg(to_jsonb(p)::text, '' order by id)) into before_digest from public.payments p;
  if (select count(*) from public.tournaments_internal where id in
    ('15f0483d-26a8-450e-a6a8-8f7a7c957277','9b6c8ac0-a542-49ab-a116-6679c8640932')
    and status='coming_soon' and price=0 and travel_info is null and additional_info is null) <> 2 then
    raise exception 'Catalogue changed; review before publishing';
  end if;
  if exists(select 1 from public.tournaments_internal where title ilike '%pirine%' or title ilike '%pyrene%') then
    raise exception 'Pirineos already exists; review before publishing';
  end if;

  -- Preserve the existing calendar event ID when correcting the tournament start date.
  update public.calendar_events
  set start_date = '2027-03-24 00:00:00 Europe/Madrid'::timestamptz,
      end_date = '2027-03-28 00:00:00 Europe/Madrid'::timestamptz
  where source_type='tournament' and source_id='15f0483d-26a8-450e-a6a8-8f7a7c957277'
    and start_date='2027-03-25 00:00:00 Europe/Madrid'::timestamptz;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Artena calendar changed; review first'; end if;

  update public.tournaments_internal set price=450, start_date='2027-03-24', end_date='2027-03-27',
    travel_info='Hotel de 4 estrellas. Vuelo no incluido.',
    additional_info='4 mensualidades de 112,50 €: 450 € + vuelo. Alternativa: 2 pagos de 215 € (430 € + vuelo; ahorro de 20 €). Seguro de cancelación y devolución opcional; consulta precio y condiciones.'
  where id='15f0483d-26a8-450e-a6a8-8f7a7c957277';
  update public.tournaments_internal set price=1025,
    travel_info='Camping / albergue.',
    additional_info='Precio total: 1.025 €. En 7 mensualidades: 6 de 150 € y una última de 125 €. Alternativa: 2 pagos de 512,50 €. Ambas modalidades suman 1.025 €.'
  where id='9b6c8ac0-a542-49ab-a116-6679c8640932';
  insert into public.tournaments_internal(id,title,price,status,type,season_period,public_summary,travel_info,additional_info)
  values('c93d7e14-a316-4dab-b240-a6e4b3d0ee81','Pirineos Cup',599,'coming_soon','externo','otro',
    'Fútbol y convivencia con Academy Costa Brava. Fechas por confirmar.',
    'Camping con bungalows.',
    'Precio total: 599 €. En 6 mensualidades: 5 de 100 € y una última de 99 €. Alternativa: 2 pagos de 299,50 €. Ambas modalidades suman 599 €. Fechas por confirmar.');
  select md5(string_agg(to_jsonb(p)::text, '' order by id)) into after_digest from public.payments p;
  if before_digest is distinct from after_digest then raise exception 'Payment digest changed; rollback'; end if;
end $$;
commit;
