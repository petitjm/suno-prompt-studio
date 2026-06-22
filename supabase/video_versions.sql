-- supabase/video_versions.sql
-- Creates saved Video Prompt versions linked to projects and saved song versions.

create table if not exists public.video_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  song_version_id uuid not null references public.song_versions(id) on delete cascade,
  title text not null default 'Untitled video prompt version',
  video_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists video_versions_project_id_idx
  on public.video_versions(project_id);

create index if not exists video_versions_song_version_id_idx
  on public.video_versions(song_version_id);

create index if not exists video_versions_created_at_idx
  on public.video_versions(created_at desc);