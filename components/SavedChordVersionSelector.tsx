'use client'

type ChordVersion = {
  id: string
  title?: string | null
  created_at?: string | null
  chord_data?: unknown
}

type SavedChordVersionSelectorProps = {
  chordVersions: ChordVersion[]
  activeChordVersionId: string | null
  onActiveChordVersionChange: (id: string) => void
  formatUkDateTime: (value: string) => string
}

export default function SavedChordVersionSelector({
  chordVersions,
  activeChordVersionId,
  onActiveChordVersionChange,
  formatUkDateTime,
}: SavedChordVersionSelectorProps) {
  return (
    <div className="mt-3">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Load saved chord version
      </label>

      <select
        value={activeChordVersionId || ''}
        onChange={(e) => onActiveChordVersionChange(e.target.value)}
        disabled={chordVersions.length === 0}
        className="w-full px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {chordVersions.length === 0
            ? 'No saved chord versions yet'
            : 'Choose a saved chord version...'}
        </option>

        {chordVersions.map((v, i) => (
          <option key={v.id} value={v.id}>
            {v.title || `Chord Version ${chordVersions.length - i}`}
            {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}