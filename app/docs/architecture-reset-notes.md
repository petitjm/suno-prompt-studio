# Architecture Reset Notes

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

```<CompareVersionControls
  source={{ ... }}
  actionState={{ ... }}
  panelSelection={{ ... }}
/>

This keeps wiring components easier to scan while still leaving state ownership in app/page.tsx.
<EditorWorkspace
  songEditor={{ ... }}
  chordEditor={{ ... }}
  shared={{ ... }}
/>



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

// ========================================================

Known local build note

npm run build may pass compile/TypeScript and then fail during page data collection with a missing DATABASE_URL for /api/sessions.

That is a local environment issue, not necessarily a code failure.

npm run dev remains the normal local app testing route.