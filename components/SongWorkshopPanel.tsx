'use client'

import { useEffect, useRef, useState } from 'react'



type SongWorkshopPanelProps = {
  lyrics: string
  songTitle: string
  songVersionTitle: string
  onUseDraft?: (draft: string) => void
}




export default function SongWorkshopPanel({
  lyrics,
  songTitle,
  songVersionTitle,
  onUseDraft,
}: SongWorkshopPanelProps) {
  const hasLyrics = lyrics.trim().length > 0

  const skipNextLyricsClearRef = useRef(false)

  useEffect(() => {
      setAnalysisMessage('')
      setAnalysisResult(null)
      setDraftMessage('')
      setDraftResult(null)
      setJustCopiedDraft(false)
    }, [lyrics])


  const [justCopiedDraft, setJustCopiedDraft] = useState(false)

  const [drafting, setDrafting] = useState(false)
    const [draftMessage, setDraftMessage] = useState('')
    const [draftResult, setDraftResult] = useState<{
      title?: string
      versionTitle?: string
      lyric?: string
      whatWasKept?: string[]
      whatChanged?: string[]
      nextStep?: string
    } | null>(null)
    

    const [workshopNotes, setWorkshopNotes] = useState('')

  const [analyzing, setAnalyzing] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [analysisResult, setAnalysisResult] = useState<{
    coreTheme?: string
    emotionalCentre?: string
    fragmentConnection?: string
    mainWeakness?: string
    suggestedShape?: string[]
    nextStep?: string
  } | null>(null)


  const copyCohesiveDraft = async () => {
      if (!draftResult?.lyric) {
        setDraftMessage('Create a cohesive draft before copying.')
        return
      }

      try {
        await navigator.clipboard.writeText(draftResult.lyric)
        setJustCopiedDraft(true)
        setDraftMessage('Cohesive draft copied.')

        window.setTimeout(() => {
          setJustCopiedDraft(false)
        }, 1500)
      } catch {
        setDraftMessage('Could not copy cohesive draft.')
      }
    }


  const createCohesiveDraft = async () => {
      if (!hasLyrics) {
        setDraftMessage('Add lyrics or fragments before creating a cohesive draft.')
        return
      }

      try {
        setDrafting(true)
        setDraftMessage('Creating cohesive draft...')
        setDraftResult(null)

        const response = await fetch('/api/song-workshop/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              lyrics,
              songTitle,
              songVersionTitle,
              workshopNotes,
            }),
                    })

        const responseText = await response.text()

        let data: {
          error?: string
          draft?: {
            title?: string
            versionTitle?: string
            lyric?: string
            whatWasKept?: string[]
            whatChanged?: string[]
            nextStep?: string
          }
        } = {}

        try {
          data = responseText ? JSON.parse(responseText) : {}
        } catch {
          throw new Error(
            `Song Workshop draft API did not return JSON. Status: ${response.status}`,
          )
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create cohesive draft.')
        }

        setDraftResult(data.draft || null)
        setDraftMessage('Cohesive draft created.')
      } catch (error) {
        setDraftMessage(
          error instanceof Error
            ? error.message
            : 'Failed to create cohesive draft.',
        )
      } finally {
        setDrafting(false)
      }
    }

  const analyzeSongIdea = async () => {
      if (!hasLyrics) {
        setAnalysisMessage('Add lyrics or fragments before analysing the song idea.')
        return
      }

      try {
        setAnalyzing(true)
        setAnalysisMessage('Analysing song idea...')
        setAnalysisResult(null)

        const response = await fetch('/api/song-workshop/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              lyrics,
              songTitle,
              songVersionTitle,
              workshopNotes,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to analyse song idea.')
        }

        setAnalysisResult(data.analysis)
        setAnalysisMessage('Song idea analysis complete.')
      } catch (error) {
        setAnalysisMessage(
          error instanceof Error
            ? error.message
            : 'Failed to analyse song idea.',
        )
      } finally {
        setAnalyzing(false)
      }
    }

    const useDraftInEditor = () => {
  if (!draftResult?.lyric) {
    setDraftMessage('Create a cohesive draft before using it in the editor.')
    return
  }

  if (!onUseDraft) {
    setDraftMessage('The editor is not available for this draft.')
    return
  }

  skipNextLyricsClearRef.current = true
  onUseDraft(draftResult.lyric)
  setDraftMessage('Cohesive draft sent to editor.')
}



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

      <div className="mb-4 rounded border border-gray-800 bg-gray-900/70 p-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-200">
              Workshop notes
            </span>
            <span className="mt-1 block text-sm text-gray-400">
              Optional creative direction for the song: theme, emotional intent, genre,
              voice, structure, what to preserve, or what feels wrong.
            </span>

            <textarea
              value={workshopNotes}
              onChange={(event) => setWorkshopNotes(event.target.value)}
              placeholder="Example: Connect the disconnected verses through chance and fortune. Keep the voice plain-spoken, emotional, and suitable for a British male acoustic singer-songwriter."
              className="mt-3 min-h-28 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100"
            />
          </label>
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
              onClick={analyzeSongIdea}
              disabled={!hasLyrics || analyzing}
              className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
            >
              {analyzing ? 'Analysing song idea...' : 'Analyze song idea'}
            </button>
            {analysisMessage && (
              <p className="mt-3 text-xs text-gray-400">
                {analysisMessage}
              </p>
            )}

            {analysisResult && (
              <div className="mt-4 rounded border border-gray-800 bg-gray-950 p-4">
                <h2 className="text-sm font-semibold text-gray-200">
                  Song idea analysis
                </h2>

                <div className="mt-3 grid gap-3 text-sm text-gray-400">
                  <div>
                    <span className="font-medium text-gray-300">Core theme:</span>{' '}
                    {analysisResult.coreTheme}
                  </div>

                  <div>
                    <span className="font-medium text-gray-300">Emotional centre:</span>{' '}
                    {analysisResult.emotionalCentre}
                  </div>

                  <div>
                    <span className="font-medium text-gray-300">How the fragments connect:</span>{' '}
                    {analysisResult.fragmentConnection}
                  </div>

                  <div>
                    <span className="font-medium text-gray-300">Main weakness:</span>{' '}
                    {analysisResult.mainWeakness}
                  </div>

                  {analysisResult.suggestedShape && (
                    <div>
                      <div className="font-medium text-gray-300">Suggested song shape:</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {analysisResult.suggestedShape.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {draftMessage && (
  <p className="mt-3 text-xs text-gray-400">
    {draftMessage}
  </p>
)}

{draftResult && (
  <div className="mt-4 rounded border border-gray-800 bg-gray-950 p-4">
   <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-gray-200">
        Cohesive draft
      </h2>

      <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useDraftInEditor}
            disabled={!draftResult.lyric || !onUseDraft}
            className="rounded bg-gray-700 px-3 py-1 text-xs font-medium text-gray-200 hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
          >
            Use draft in editor
          </button>

          <button
            type="button"
            onClick={copyCohesiveDraft}
            disabled={!draftResult.lyric}
            className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-900 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            {justCopiedDraft ? 'Copied ✓' : 'Copy draft'}
          </button>
        </div>
    </div>

    <pre className="mt-3 whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-300">
      {draftResult.lyric}
    </pre>

    {draftResult.whatWasKept && (
      <div className="mt-4 text-sm text-gray-400">
        <div className="font-medium text-gray-300">What was kept:</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {draftResult.whatWasKept.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    )}

    {draftResult.whatChanged && (
      <div className="mt-4 text-sm text-gray-400">
        <div className="font-medium text-gray-300">What changed:</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {draftResult.whatChanged.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    )}

    {draftResult.nextStep && (
      <div className="mt-4 text-sm text-gray-400">
        <span className="font-medium text-gray-300">Recommended next step:</span>{' '}
        {draftResult.nextStep}
      </div>
    )}
  </div>
)}
                  <div>
                    <span className="font-medium text-gray-300">Recommended next step:</span>{' '}
                    {analysisResult.nextStep}
                  </div>
                </div>
              </div>
            )}
         <button
          type="button"
          onClick={createCohesiveDraft}
          disabled={!hasLyrics || drafting}
          className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
        >
          {drafting ? 'Creating cohesive draft...' : 'Create cohesive draft'}
        </button>
        </div>
      </div>
    </section>
  )
}