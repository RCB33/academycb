-- Only confirmed dossier/user data. Idempotent. No memberships or receipts are created.
begin;
insert into public.membership_plans(name,description,duration_months,price,enrollment_fee,frequency,season_start,season_end,sort_order)
values
 ('Tecnificación · 1 sesión semanal · 2026/2027','75 €/mes. Una sesión semanal. Temporada del 15/09/2026 al 31/05/2027. Matrícula anual de 30 € solo para nuevos jugadores. Mes parcial sujeto a revisión, sin prorrateo automático.',9,75,30,'mensual','2026-09-15','2027-05-31',10),
 ('Tecnificación · 2 sesiones semanales · 2026/2027','140 €/mes. Una sesión de lunes a viernes y otra el domingo. Temporada del 15/09/2026 al 31/05/2027. Matrícula anual de 30 € solo para nuevos jugadores. Mes parcial sujeto a revisión.',9,140,30,'mensual','2026-09-15','2027-05-31',20)
on conflict(name) do nothing;

insert into public.academy_settings(key,value,is_public) values
 ('current_season','2026/2027',true),
 ('season_start','2026-09-15',false),
 ('season_end','2027-05-31',false),
 ('academy_phone','654139429',true),
 ('academy_whatsapp','34654139429',true),
 ('academy_email','costabravaacademy@gmail.com',true),
 ('privacy_contact_email','costabravaacademy@gmail.com',true),
 ('academy_instagram','https://www.instagram.com/academy.costabrava24/',true),
 ('tournaments_url','https://www.academycostabrava.com/torneos',true),
 ('bank_iban','ES0621006176920200072768',false),
 ('bank_account_holder','Manuel Matias Martínez',false),
 ('bank_transfer_instructions','Indica el nombre del jugador y el concepto del recibo. La transferencia queda pendiente de comprobación por administración.',false)
on conflict(key) do update set value=excluded.value,is_public=excluded.is_public,updated_at=now()
where nullif(trim(academy_settings.value),'') is null;

insert into public.campuses(name,year,type,start_date,end_date,capacity,price,status,location,schedule,description)
select 'Campus Navidad 2026–2027',2026,'invierno','2026-12-22','2027-01-07',0,89,'draft',
 'Camp Municipal de Santa Cristina d’Aro','09:00–14:00',
 'BORRADOR: aforo pendiente de confirmar. Nacidos entre 2013 y 2022. Semana 1: 22, 23 y 24 diciembre (89 €). Semana 2: 28, 29, 30 y 31 diciembre (99 €). Semana 3: 4, 5 y 7 enero (89 €). Pack completo: 197 €, incluye sudadera. Descuento del 5% para el segundo hermano inscrito. El importe se revisa según las semanas elegidas antes de asignar la plaza. Contacto campus: 691179600 · costabravaacademy@gmail.com.'
where not exists(select 1 from public.campuses where name='Campus Navidad 2026–2027' and start_date='2026-12-22');
commit;
