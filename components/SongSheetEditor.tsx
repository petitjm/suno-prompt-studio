'use client'

type SongSheetEditorProps = {
  performanceSheet: string
  setPerformanceSheet: (value: string) => void
}

export default function SongSheetEditor({
  performanceSheet,
  setPerformanceSheet,
}: SongSheetEditorProps) {
  return (
    <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
      <h2 className="text-lg font-semibold mb-1">Song Sheet / Lyrics</h2>

      <p className="text-xs text-gray-400 mb-3">
        Paste lyrics here. Chord lines above lyrics are allowed; use Remove Chords in the Rewrite Lab before rewriting.
      </p>

      <textarea
        value={performanceSheet}
        onChange={(e) => setPerformanceSheet(e.target.value)}
        placeholder="Paste lyrics here. Use headings like [Verse 1], [Chorus], [Bridge]."
        className="w-full min-h-[300px] px-3 py-2 rounded bg-gray-700 text-white font-mono text-sm"
      />
    </div>
  )
}