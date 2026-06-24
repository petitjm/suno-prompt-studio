'use client'

type SongWorkshopPanelProps = {
  lyrics: string
  songTitle: string
  songVersionTitle: string
}

export default function SongWorkshopPanel({
  lyrics,
  songTitle,
  songVersionTitle,
}: SongWorkshopPanelProps) {
  const hasLyrics = lyrics.trim().length > 0

  return (
    <section className="rounded border border-gray-800 bg-gray-950/70 p-4">
      <div className="mb-4">
        <h1 className="text-xl mb-2">Song Workshop</h1>
        <p className="text-sm text-gray-400">
          Develop rough ideas, disconnected verses, choruses, titles, and
          phrases into a clearer song direction before sending anything to
          Suno, Chords, Rehearse, Perform, or Video.
        </p>
      </div>

      <div className="mb-4 rounded border border-gray-800 bg-gray-900/70 p-4">
        <h2 className="text-sm font-semibold text-gray-200">
          Current song context
        </h2>

        <div className="mt-2 grid gap-1 text-sm text-gray-400">
          <div>
            <span className="text-gray-300">Project:</span>{' '}
            {songTitle || 'Untitled project'}
          </div>

          <div>
            <span className="text-gray-300">Song version:</span>{' '}
            {songVersionTitle || 'Unsaved or untitled version'}
          </div>

          <div>
            <span className="text-gray-300">Lyrics available:</span>{' '}
            {hasLyrics ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900/70 p-4">
        <h2 className="text-sm font-semibold text-gray-200">
          Develop mode coming next
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          This section will analyse the current song, identify the core theme,
          suggest a structure, and help create a cohesive draft while preserving
          your original intent.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!hasLyrics}
            className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
          >
            Analyze song idea
          </button>

          <button
            type="button"
            disabled={!hasLyrics}
            className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            Create cohesive draft
          </button>
        </div>
      </div>
    </section>
  )
}