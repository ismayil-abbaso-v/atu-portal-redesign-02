alter table public.announcements
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.announcements
  drop constraint if exists announcements_media_array_check;

alter table public.announcements
  add constraint announcements_media_array_check
  check (jsonb_typeof(media) = 'array');

-- Köhnə tək şəkilli elanları yeni media modelinə keçiririk.
update public.announcements
set media = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'url', image_url,
    'caption', '',
    'layout', 'full',
    'position', -2
  )
)
where image_url is not null
  and coalesce(media, '[]'::jsonb) = '[]'::jsonb;
