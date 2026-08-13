-- supabase/audio_versions.sql
-- Creates persistent generated audio versions linked to projects,
-- saved song versions, and optionally saved chord versions.

create table if not exists public.audio_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  song_version_id uuid not null references public.song_versions(id) on delete cascade,
  chord_version_id uuid references public.chord_versions(id) on delete set null,
  title text not null default 'Generated musical guide',
  storage_path text not null unique,
  tempo_bpm integer not null,
  duration_seconds double precision,
  render_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audio_versions_project_id_idx
  on public.audio_versions(project_id);

create index if not exists audio_versions_song_version_id_idx
  on public.audio_versions(song_version_id);

create index if not exists audio_versions_chord_version_id_idx
  on public.audio_versions(chord_version_id);

create index if not exists audio_versions_created_at_idx
  on public.audio_versions(created_at desc);


-- Protect metadata with Row Level Security.
alter table public.audio_versions enable row level security;


drop policy if exists "Users can read own audio versions"
  on public.audio_versions;

create policy "Users can read own audio versions"
on public.audio_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = audio_versions.project_id
      and projects.user_id = auth.uid()
  )
);


drop policy if exists "Users can insert own audio versions"
  on public.audio_versions;

create policy "Users can insert own audio versions"
on public.audio_versions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = audio_versions.project_id
      and projects.user_id = auth.uid()
  )
);


drop policy if exists "Users can update own audio versions"
  on public.audio_versions;

create policy "Users can update own audio versions"
on public.audio_versions
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = audio_versions.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = audio_versions.project_id
      and projects.user_id = auth.uid()
  )
);


drop policy if exists "Users can delete own audio versions"
  on public.audio_versions;

create policy "Users can delete own audio versions"
on public.audio_versions
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = audio_versions.project_id
      and projects.user_id = auth.uid()
  )
);


-- Private bucket for generated Make Song / rehearsal WAV files.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'generated-audio',
  'generated-audio',
  false,
  52428800,
  array['audio/wav', 'audio/x-wav']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- Files are stored beneath the authenticated user's ID:
--
--   <user-id>/<project-id>/<song-version-id>/<audio-version-id>.wav

drop policy if exists "Users can upload own generated audio"
  on storage.objects;

create policy "Users can upload own generated audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);


drop policy if exists "Users can read own generated audio"
  on storage.objects;

create policy "Users can read own generated audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);


drop policy if exists "Users can update own generated audio"
  on storage.objects;

create policy "Users can update own generated audio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'generated-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'generated-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);


drop policy if exists "Users can delete own generated audio"
  on storage.objects;

create policy "Users can delete own generated audio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generated-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);