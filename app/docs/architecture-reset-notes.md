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