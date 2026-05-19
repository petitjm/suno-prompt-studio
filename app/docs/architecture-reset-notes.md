# Architecture Reset Notes


## Current checkpoint

The architecture reset has reached a stable checkpoint.

Completed:

- Write mode editor split into focused UI components.
- `SongEditorPanel` reduced to a wiring/composition component.
- Major prop boundaries grouped into object props.
- Saved song-version and chord-version selectors extracted.
- Song sheet editor extracted.
- Structured Chord JSON editor extracted.
- Compare controls extracted.
- Shared helpers added for formatting and version data access.
- Project version fetching and normalisation extracted into `lib/projectVersions.ts`.
- `ChordVersionRecord` preserved for page state and project-loading data.

Recommended next development rule:

Make future changes in small, isolated steps and avoid moving React state ownership unless there is a clear reason.





## Current editor structure

The Write mode editor has been split into smaller UI components while keeping state ownership mostly in `app/page.tsx`.

```text
SongEditorPanel
├─ WritePanelHeader
├─ EditorWorkspace
│  ├─ SongVersionEditor
│  │  ├─ SongSheetEditor
│  │  ├─ SavedSongVersionSelector
│  │  └─ SongVersionSaveControls
│  └─ StructuredChordJsonEditor
│     └─ SavedChordVersionSelector
└─ CompareVersionControls

State ownership

Most state is still owned by app/page.tsx.

SongEditorPanel is mainly a wiring component.

EditorWorkspace groups the main editing areas.

SongVersionEditor owns the local behaviour for selecting saved song versions.

StructuredChordJsonEditor owns the local behaviour for selecting saved chord versions.

Important workflow separation

Song sheet embedded chords and Structured Chord JSON are separate workflows.

Saved song versions affect the Song Sheet / Lyrics editor.

Saved chord versions affect the Structured Chord JSON editor.

// =================================================================
// component checklist 
## Component responsibilities

## Prop grouping pattern

Large UI components now prefer grouped object props where it improves readability.

Examples:

```tsx
<SongEditorPanel
  songEditor={{ ... }}
  chordEditor={{ ... }}
  compareControls={{ ... }}
  shared={{ ... }}
/>
<EditorWorkspace
  songEditor={{ ... }}
  chordEditor={{ ... }}
  shared={{ ... }}
/>
<CompareVersionControls
  source={{ ... }}
  actionState={{ ... }}
  panelSelection={{ ... }}
/>

This keeps wiring components easier to scan while still leaving state ownership in app/page.tsx.

## Current prop boundary

`app/page.tsx` still owns the main state.

`SongEditorPanel` receives grouped props and passes them into focused child components.

This keeps the current state model stable while reducing the visual complexity o


### `SongEditorPanel`

Wiring component for Write mode.

It should not contain detailed editor JSX or version-selection logic.

### `EditorWorkspace`

Groups the main editing areas:

- Song sheet / saved song versions / song saving
- Structured chord JSON / saved chord versions / chord saving

### `SongVersionEditor`

Owns the local behaviour for selecting a saved song version and loading it into the Song Sheet / Lyrics editor.

### `StructuredChordJsonEditor`

Owns the local behaviour for selecting a saved chord version and loading it into the Structured Chord JSON editor.

### `CompareVersionControls`

Owns the compare control UI:

- Compare current vs last saved
- Load saved version into left panel
- Load saved version into right panel
- Load current into either compare panel

### Selector components

Selector components should stay simple and UI-only.

They receive data and callbacks, but should not decide how loaded content changes editor state.


## Shared helpers

Small pure helpers now live in `lib/` rather than inside UI components or `app/page.tsx`.

Current helpers:

- `lib/chords.ts`
  - `looksLikeChordLine`
  - `extractLyricsOnly`
  - Detects chord-only lines and extracts lyrics-only text while preserving sensible spacing.

- `lib/songSections.ts`
  - `isSectionHeader`
  - Detects song section headings while avoiding chord-only lines.

  Chord-line detection is shared by lyrics extraction and section detection.

This helps keep Remove Chords, section parsing, and rewrite workflows consistent.

- `lib/projectVersions.ts`
  - `loadProjectVersions`
  - `normaliseProjectVersionData`
  - Fetches song-version and chord-version API data for a project.
  - Returns per-endpoint success/error state so one failed endpoint does not automatically wipe the other.
  - Normalises raw API responses into editor-ready values.
  - Does not update React state directly.

  ## Project loading resilience

`loadProjectData` in `app/page.tsx` now handles song-version and chord-version load results separately.

If one endpoint fails and the other succeeds, the successful data is still applied to the editor.

Unexpected errors still fall through to the catch block and clear editor state as a defensive fallback.

  `loadProjectData` in `app/page.tsx` still owns React state updates.

`normaliseProjectVersionData` prepares the data used by those state updates, including:

- saved song versions
- saved chord versions
- active song/chord version IDs
- latest lyrics
- latest structured chord JSON
- initial compare panel IDs

  Project data loading still lives in `app/page.tsx`.
  The helper only handles API fetching and response validation. State updates remain in the page component for now.

- `lib/format.ts`
  - `formatUkDateTime`
  - Formats saved version timestamps for UK display.

- `lib/songVersions.ts`
  - `getSongVersionLyrics`
  - `getInitialCompareSongIds`
  - Safely extracts `lyrics_full` from a saved song version and chooses initial compare panel version IDs.

- `lib/chordVersions.ts`
  - `getChordVersionData`
  - Safely extracts structured chord data from a saved chord version.

  ## Chord version types

There are two chord-version shapes in use:

- `ChordVersionRecord`
  - Full database/API record.
  - Used by `app/page.tsx` state and project loading.
  - Includes fields such as `project_id`.

- `ChordVersion`
  - Lightweight UI shape.
  - Used by selector/editor components where only `id`, `title`, `created_at`, and `chord_data` are needed.

Project-loading helpers should preserve `ChordVersionRecord[]` so they remain compatible with page state.

`app/page.tsx` now uses these helpers during project loading, so UI components and project-loading logic rely on the same version-data access patterns.
These helpers should stay pure and should not call APIs, mutate React state, or depend on component lifecycle.
// ========================================================

Known local build note

npm run build may pass compile/TypeScript and then fail during page data collection with a missing DATABASE_URL for /api/sessions.

That is a local environment issue, not necessarily a code failure.

npm run dev remains the normal local app testing route.