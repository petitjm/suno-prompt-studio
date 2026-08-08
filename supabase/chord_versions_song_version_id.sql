alter table public.chord_versions
add column if not exists song_version_id uuid
references public.song_versions(id)
on delete set null;

create index if not exists chord_versions_song_version_id_idx
on public.chord_versions(song_version_id);