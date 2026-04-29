begin;

alter table public.users
  add column if not exists county_id bigint references public.counties (id) on delete set null;

alter table public.users
  add column if not exists town_id bigint;

alter table public.users
  drop constraint if exists users_town_requires_county;

alter table public.users
  add constraint users_town_requires_county
  check (town_id is null or county_id is not null);

alter table public.users
  drop constraint if exists users_county_town_consistency_fk;

alter table public.users
  add constraint users_county_town_consistency_fk
  foreign key (county_id, town_id)
  references public.towns (county_id, id)
  on delete set null;

create index if not exists idx_users_county_id on public.users (county_id);
create index if not exists idx_users_town_id on public.users (town_id);

insert into public.counties (name)
values
  ('Baringo'),
  ('Bomet'),
  ('Bungoma'),
  ('Busia'),
  ('Elgeyo-Marakwet'),
  ('Embu'),
  ('Garissa'),
  ('Homa Bay'),
  ('Isiolo'),
  ('Kajiado'),
  ('Kakamega'),
  ('Kericho'),
  ('Kiambu'),
  ('Kilifi'),
  ('Kirinyaga'),
  ('Kisii'),
  ('Kisumu'),
  ('Kitui'),
  ('Kwale'),
  ('Laikipia'),
  ('Lamu'),
  ('Machakos'),
  ('Makueni'),
  ('Mandera'),
  ('Marsabit'),
  ('Meru'),
  ('Migori'),
  ('Mombasa'),
  ('Murang''a'),
  ('Nairobi'),
  ('Nakuru'),
  ('Nandi'),
  ('Narok'),
  ('Nyamira'),
  ('Nyandarua'),
  ('Nyeri'),
  ('Samburu'),
  ('Siaya'),
  ('Taita-Taveta'),
  ('Tana River'),
  ('Tharaka-Nithi'),
  ('Trans Nzoia'),
  ('Turkana'),
  ('Uasin Gishu'),
  ('Vihiga'),
  ('Wajir'),
  ('West Pokot')
on conflict (name) do nothing;

insert into public.towns (county_id, name)
select c.id, seed.town_name
from public.counties c
join (
  values
    ('Baringo', 'Kabarnet'),
    ('Baringo', 'Eldama Ravine'),
    ('Bomet', 'Bomet'),
    ('Bomet', 'Sotik'),
    ('Bungoma', 'Bungoma'),
    ('Bungoma', 'Webuye'),
    ('Busia', 'Busia'),
    ('Busia', 'Malaba'),
    ('Elgeyo-Marakwet', 'Iten'),
    ('Elgeyo-Marakwet', 'Kapsowar'),
    ('Embu', 'Embu'),
    ('Embu', 'Runyenjes'),
    ('Garissa', 'Garissa'),
    ('Garissa', 'Dadaab'),
    ('Homa Bay', 'Homa Bay'),
    ('Homa Bay', 'Oyugis'),
    ('Isiolo', 'Isiolo'),
    ('Isiolo', 'Merti'),
    ('Kajiado', 'Kajiado'),
    ('Kajiado', 'Kitengela'),
    ('Kajiado', 'Ngong'),
    ('Kakamega', 'Kakamega'),
    ('Kakamega', 'Mumias'),
    ('Kericho', 'Kericho'),
    ('Kericho', 'Litein'),
    ('Kiambu', 'Kiambu'),
    ('Kiambu', 'Thika'),
    ('Kiambu', 'Ruiru'),
    ('Kiambu', 'Kikuyu'),
    ('Kilifi', 'Kilifi'),
    ('Kilifi', 'Malindi'),
    ('Kilifi', 'Watamu'),
    ('Kirinyaga', 'Kerugoya'),
    ('Kirinyaga', 'Wang''uru'),
    ('Kirinyaga', 'Sagana'),
    ('Kisii', 'Kisii'),
    ('Kisii', 'Ogembo'),
    ('Kisumu', 'Kisumu'),
    ('Kisumu', 'Ahero'),
    ('Kitui', 'Kitui'),
    ('Kitui', 'Mwingi'),
    ('Kwale', 'Kwale'),
    ('Kwale', 'Ukunda'),
    ('Kwale', 'Msambweni'),
    ('Laikipia', 'Nanyuki'),
    ('Laikipia', 'Nyahururu'),
    ('Lamu', 'Lamu'),
    ('Lamu', 'Mpeketoni'),
    ('Machakos', 'Machakos'),
    ('Machakos', 'Athi River'),
    ('Machakos', 'Mlolongo'),
    ('Makueni', 'Wote'),
    ('Makueni', 'Emali'),
    ('Makueni', 'Makindu'),
    ('Mandera', 'Mandera'),
    ('Mandera', 'El Wak'),
    ('Marsabit', 'Marsabit'),
    ('Marsabit', 'Moyale'),
    ('Meru', 'Meru'),
    ('Meru', 'Maua'),
    ('Meru', 'Nkubu'),
    ('Migori', 'Migori'),
    ('Migori', 'Rongo'),
    ('Mombasa', 'Mombasa'),
    ('Mombasa', 'Likoni'),
    ('Mombasa', 'Bamburi'),
    ('Murang''a', 'Murang''a'),
    ('Murang''a', 'Kenol'),
    ('Murang''a', 'Kangema'),
    ('Nairobi', 'Nairobi'),
    ('Nairobi', 'Westlands'),
    ('Nairobi', 'Embakasi'),
    ('Nairobi', 'Karen'),
    ('Nakuru', 'Nakuru'),
    ('Nakuru', 'Naivasha'),
    ('Nakuru', 'Molo'),
    ('Nakuru', 'Gilgil'),
    ('Nandi', 'Kapsabet'),
    ('Nandi', 'Nandi Hills'),
    ('Narok', 'Narok'),
    ('Narok', 'Kilgoris'),
    ('Nyamira', 'Nyamira'),
    ('Nyamira', 'Keroka'),
    ('Nyandarua', 'Ol Kalou'),
    ('Nyandarua', 'Engineer'),
    ('Nyeri', 'Nyeri'),
    ('Nyeri', 'Karatina'),
    ('Nyeri', 'Othaya'),
    ('Samburu', 'Maralal'),
    ('Samburu', 'Baragoi'),
    ('Siaya', 'Siaya'),
    ('Siaya', 'Ugunja'),
    ('Taita-Taveta', 'Voi'),
    ('Taita-Taveta', 'Taveta'),
    ('Taita-Taveta', 'Wundanyi'),
    ('Tana River', 'Hola'),
    ('Tana River', 'Garsen'),
    ('Tharaka-Nithi', 'Chuka'),
    ('Tharaka-Nithi', 'Marimanti'),
    ('Trans Nzoia', 'Kitale'),
    ('Trans Nzoia', 'Kiminini'),
    ('Turkana', 'Lodwar'),
    ('Turkana', 'Kakuma'),
    ('Uasin Gishu', 'Eldoret'),
    ('Uasin Gishu', 'Burnt Forest'),
    ('Vihiga', 'Mbale'),
    ('Vihiga', 'Luanda'),
    ('Wajir', 'Wajir'),
    ('Wajir', 'Habaswein'),
    ('West Pokot', 'Kapenguria'),
    ('West Pokot', 'Ortum')
) as seed(county_name, town_name)
  on c.name = seed.county_name
on conflict (county_id, name) do nothing;

commit;
