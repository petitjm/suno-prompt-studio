// /types/song.ts

export type Project = {
  id: string
  title: string
  created_at?: string
  updated_at?: string
}

export type FormState = {
  genre: string
  moods: string[]
  theme: string
  hook: string
  dnaId: string
}

export type GenerateResponse = {
  style_short?: string
  style_detailed?: string
  lyrics_brief?: string
  lyrics_full?: string
  lyrics_template?: string
  error?: string
}

export type ChordVersion = {
  id: string
  title?: string | null
  created_at?: string | null
  chord_data?: unknown
}

export type ChordResponse = {
  key?: string
  capo?: string
  verse?: string
  chorus?: string
  bridge?: string
  notes?: string
  error?: string
  source?: string
  sections?: Record<string, string>
  [key: string]: unknown
}

export type SongVersionRecord = {
  id: string
  project_id: string
  title?: string
  form?: FormState
  result?: GenerateResponse
  created_at?: string
}

export type ChordVersionRecord = {
  id: string
  project_id: string
  title?: string
  chord_data?: ChordResponse
  created_at?: string
}

export type ArtistDNAProfile = {
  id?: string
  artist_name: string
  vocal_range: string
  core_genres: string
  lyrical_style: string
  emotional_tone: string
  writing_strengths: string
  avoid_list: string
  visual_style: string
  performance_style: string
  dna_summary?: string
}

export type DNAAnalysisInput = {
  lyrics_samples: string
  chord_examples: string
  artist_references: string
  self_description: string
}

export type RewriteMode =
  | 'strengthen_chorus'
  | 'more_conversational'
  | 'more_poetic'
  | 'more_universal'
  | 'more_personal'
  | 'simplify_lyrics'
  | 'improve_opening_line'
  | 'tighten_live'

export type ChordRewriteMode =
  | 'lift_chorus'
  | 'simpler_live'
  | 'richer_chords'
  | 'better_bridge'
  | 'baritone_key'
  | 'capo_friendly'

  export type AppMode =
  | 'write'
  | 'chords'
  | 'sheet'
  | 'rehearse'
  | 'perform'
  | 'video'

export type ProjectSortKey = 'updated_at' | 'title'
export type SortDirection = 'asc' | 'desc'

export type PerformanceSection = {
  id: string
  label: string
  content: string
}

export type PreviewSectionKey = 'verse' | 'chorus' | 'bridge' | 'full_song'
export type PreviewInstrument = 'guitar' | 'piano'
export type PreviewFeel = 'straight' | 'swing'
export type PreviewPattern = 'ballad_strum' | 'country_train' | 'fingerpick' | 'piano_block'

export type PreviewBar = {
  label: string
  chord: string
  sectionId?: string | null
}

export type PreviewBarMeta = {
  barIndex: number
  label: string
  chord: string
  sectionId: string | null
}