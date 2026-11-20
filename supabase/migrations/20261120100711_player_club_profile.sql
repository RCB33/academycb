-- Club information is independent of Academy categories, groups and enrolments.
-- Existing children retain NULL until their family or administration completes it.
alter table public.children
 add column club_name text,
 add column club_category text,
 add column club_division text,
 add constraint children_club_name_length check (club_name is null or char_length(club_name) between 1 and 120),
 add constraint children_club_category_valid check (club_category is null or club_category in ('Escoleta','S7','S8','S9','S10','S11','S12','S13','S14','S15','S16')),
 add constraint children_club_division_valid check (club_division is null or club_division in ('Primera División','Segunda División','Preferente','División de Honor'));
-- Existing SELECT policies already restrict these fields to the family,
-- assigned coach and authorized administrators. No general family UPDATE grant.
