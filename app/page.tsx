'use client'
import { CSSProperties, useState } from 'react'

type ResultType = {
  dna_id?: string
  dna_name?: string
  style_short?: string
  style_detailed?: string
  lyrics_brief?: string
  lyrics_full?: string
  lyrics_template?: string
  error?: string
}

type GenerateResponse = ResultType & {
  versions?: ResultType[]
}

type ThemeIdeasResponse = {
  refined_theme?: string
  related_themes?: string[]
  error?: string
}

type HookIdeasResponse = {
  hooks?: string[]
  error?: string
}

type VideoVersion = {
  dna_id?: string
  dna_name?: string
  global_style?: string
  character_prompt?: string
  video_concept?: string
  scene_prompts?: { section: string; prompt: string }[]
}

type VideoResponse = VideoVersion & {
  versions?: VideoVersion[]
  error?: string
}

const dnaOptions = [
  { id: 'mpj-master', label: 'MPJ Master' },
  { id: 'commercial-hit', label: 'Commercial Hit' },
  { id: 'raw-folk', label: 'Raw Folk' },
]

const genreOptions = [
  'Modern Country',
  'Acoustic Folk',
  'Folk Rock',
  'Indie Pop',
  'Bedroom Pop',
  'Blues Ballad',
  'Cinematic Americana',
  'Festival Anthem',
]

const moodOptions = [
  'Reflective',
  'Hopeful',
  'Melancholic',
  'Heartfelt',
  'Gritty',
  'Warm',
]

export default function Home() {
  const [form, setForm] = useState({
    genre: '',
    moods: [] as string[],
    theme: '',
    hook: '',
    dnaId: 'mpj-master',
    languageStyle: 'Balanced',
    perspective: 'Balanced',
    songFocus: 'Balanced',
    liveFriendly: true,
    multiVersion: false,
  })

  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [videoResult, setVideoResult] = useState<VideoResponse | null>(null)

  const [loading, setLoading] = useState(false)
  const [rewritingLyrics, setRewritingLyrics] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)

  const [themeIdeas, setThemeIdeas] = useState<string[]>([])
  const [refinedTheme, setRefinedTheme] = useState('')
  const [themeLoading, setThemeLoading] = useState(false)

  const [hookIdeas, setHookIdeas] = useState<string[]>([])
  const [hookLoading, setHookLoading] = useState(false)

  const toggleMood = (mood: string) => {
    setForm((prev) => ({
      ...prev,
      moods: prev.moods.includes(mood)
        ? prev.moods.filter((m) => m !== mood)
        : [...prev.moods, mood],
    }))
  }

  const handleSuggestThemes = async () => {
    try {
      if (!form.theme.trim()) {
        setThemeIdeas([])
        setRefinedTheme('')
        return
      }

      setThemeLoading(true)
      setThemeIdeas([])
      setRefinedTheme('')

      const res = await fetch('/api/theme-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: form.theme,
          genre: form.genre,
          moods: form.moods,
          dnaId: form.dnaId,
        }),
      })

      const text = await res.text()
      let data: ThemeIdeasResponse

      try {
        data = JSON.parse(text)
      } catch {
        setThemeIdeas([])
        setRefinedTheme('')
        return
      }

      if (!res.ok) {
        setThemeIdeas([])
        setRefinedTheme(data.error || '')
        return
      }

      setRefinedTheme(data.refined_theme || '')
      setThemeIdeas(data.related_themes || [])
    } catch (err) {
      console.error('Theme suggestion failed:', err)
      setThemeIdeas([])
      setRefinedTheme('')
    } finally {
      setThemeLoading(false)
    }
  }

  const handleSuggestHooks = async () => {
    try {
      if (!form.theme.trim()) {
        setHookIdeas([])
        return
      }

      setHookLoading(true)
      setHookIdeas([])

      const res = await fetch('/api/hook-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: form.theme,
          genre: form.genre,
          moods: form.moods,
          dnaId: form.dnaId,
        }),
      })

      const text = await res.text()
      let data: HookIdeasResponse

      try {
        data = JSON.parse(text)
      } catch {
        setHookIdeas([])
        return
      }

      if (!res.ok) {
        setHookIdeas([])
        return
      }

      setHookIdeas(data.hooks || [])
    } catch (err) {
      console.error('Hook suggestion failed:', err)
      setHookIdeas([])
    } finally {
      setHookLoading(false)
    }
  }

  const requestGeneration = async (lyricsOnly: boolean) => {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        genre: form.genre,
        moods: form.moods,
        theme: form.theme,
        hook: form.hook,
        dnaId: form.dnaId,
        lyricsOnly,
        languageStyle: form.languageStyle,
        perspective: form.perspective,
        songFocus: form.songFocus,
        liveFriendly: form.liveFriendly,
        multiVersion: form.multiVersion,
      }),
    })

    const text = await res.text()
    let data: GenerateResponse

    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('API route not found or returned HTML instead of JSON')
    }

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong')
    }

    return data
  }

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setResult(null)
      setVideoResult(null)

      const data = await requestGeneration(false)
      setResult(data)
    } catch (err: any) {
      console.error('Request failed:', err)
      setResult({ error: err.message || 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  const handleRewriteLyrics = async () => {
    try {
      setRewritingLyrics(true)

      const data = await requestGeneration(true)

      if (data.versions) {
        setResult(data)
      } else {
        setResult((prev) => ({
          ...prev,
          lyrics_brief: data.lyrics_brief,
          lyrics_full: data.lyrics_full,
          error: undefined,
        }))
      }
    } catch (err: any) {
      console.error('Lyrics rewrite failed:', err)
      setResult((prev) => ({
        ...prev,
        error: err.message || 'Lyrics rewrite failed',
      }))
    } finally {
      setRewritingLyrics(false)
    }
  }

  const handleGenerateVideo = async () => {
    try {
      setVideoLoading(true)
      setVideoResult(null)

      const lyricsSource =
        result?.lyrics_full ||
        result?.versions?.[0]?.lyrics_full ||
        ''

      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: form.genre,
          moods: form.moods,
          theme: form.theme,
          hook: form.hook,
          dnaId: form.dnaId,
          lyrics: lyricsSource,
          multiVersion: form.multiVersion,
        }),
      })

      const text = await res.text()
      let data: VideoResponse

      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Video route not found or returned HTML instead of JSON')
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate video prompts')
      }

      setVideoResult(data)
    } catch (err: any) {
      console.error('Video generation failed:', err)
      setVideoResult({ error: err.message || 'Video generation failed' })
    } finally {
      setVideoLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text || '')
      alert('Copied!')
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const buildExportText = () => {
    const lines: string[] = []

    lines.push('SUNO PROMPT STUDIO EXPORT')
    lines.push('========================')
    lines.push('')

    lines.push('INPUTS')
    lines.push('------')
    lines.push(`DNA: ${form.dnaId}`)
    lines.push(`Genre: ${form.genre}`)
    lines.push(`Moods: ${form.moods.join(', ')}`)
    lines.push(`Theme: ${form.theme}`)
    lines.push(`Hook: ${form.hook}`)
    lines.push('')

    lines.push('LYRIC DIRECTION CONTROLS')
    lines.push('------------------------')
    lines.push(`Language Style: ${form.languageStyle}`)
    lines.push(`Perspective: ${form.perspective}`)
    lines.push(`Song Focus: ${form.songFocus}`)
    lines.push(`Live-Friendly: ${form.liveFriendly ? 'On' : 'Off'}`)
    lines.push(`Generation Mode: ${form.multiVersion ? 'Multi-Version' : 'Single Version'}`)
    lines.push('')

    if (result) {
      lines.push('SONG OUTPUT')
      lines.push('-----------')
      lines.push('')

      if (result.versions && result.versions.length > 0) {
        result.versions.forEach((version, index) => {
          lines.push(`VERSION ${index + 1}: ${version.dna_name || version.dna_id || 'Unknown'}`)
          lines.push('----------------------------------------')
          lines.push(`Style (Short): ${version.style_short || ''}`)
          lines.push('')
          lines.push('Style (Detailed):')
          lines.push(version.style_detailed || '')
          lines.push('')
          lines.push('Lyrics Brief:')
          lines.push(version.lyrics_brief || '')
          lines.push('')
          lines.push('Full Lyrics:')
          lines.push(version.lyrics_full || '')
          lines.push('')
        })
      } else {
        lines.push(`Style (Short): ${result.style_short || ''}`)
        lines.push('')
        lines.push('Style (Detailed):')
        lines.push(result.style_detailed || '')
        lines.push('')
        lines.push('Lyrics Brief:')
        lines.push(result.lyrics_brief || '')
        lines.push('')
        lines.push('Full Lyrics:')
        lines.push(result.lyrics_full || '')
        lines.push('')
      }
    }

    if (videoResult) {
      lines.push('OPENART OUTPUT')
      lines.push('--------------')
      lines.push('')

      if (videoResult.versions && videoResult.versions.length > 0) {
        videoResult.versions.forEach((video, index) => {
          lines.push(`VIDEO VERSION ${index + 1}: ${video.dna_name || video.dna_id || 'Unknown'}`)
          lines.push('----------------------------------------')
          lines.push('Global Style:')
          lines.push(video.global_style || '')
          lines.push('')
          lines.push('Character Prompt:')
          lines.push(video.character_prompt || '')
          lines.push('')
          lines.push('Video Concept:')
          lines.push(video.video_concept || '')
          lines.push('')

          if (video.scene_prompts?.length) {
            lines.push('Scene Prompts:')
            video.scene_prompts.forEach((scene) => {
              lines.push(`[${scene.section}]`)
              lines.push(scene.prompt || '')
              lines.push('')
            })
          }
        })
      } else {
        lines.push('Global Style:')
        lines.push(videoResult.global_style || '')
        lines.push('')
        lines.push('Character Prompt:')
        lines.push(videoResult.character_prompt || '')
        lines.push('')
        lines.push('Video Concept:')
        lines.push(videoResult.video_concept || '')
        lines.push('')

        if (videoResult.scene_prompts?.length) {
          lines.push('Scene Prompts:')
          videoResult.scene_prompts.forEach((scene) => {
            lines.push(`[${scene.section}]`)
            lines.push(scene.prompt || '')
            lines.push('')
          })
        }
      }
    }

    return lines.join('\n')
  }

  const handleSaveToFile = () => {
    const text = buildExportText()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    const safeTheme = (form.theme || 'song-idea')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    a.href = url
    a.download = `suno-prompt-studio-${safeTheme}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  }

  const pageStyle: CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#18181b',
    color: 'white',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
  }

  const headerStyle: CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px',
  }

  const subHeaderStyle: CSSProperties = {
    color: '#a1a1aa',
    marginBottom: '24px',
  }

  const layoutStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    alignItems: 'start',
  }

  const panelStyle: CSSProperties = {
    backgroundColor: '#27272a',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  }

  const sectionStyle: CSSProperties = {
    marginBottom: '24px',
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    marginBottom: '10px',
    fontWeight: 600,
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #52525b',
    backgroundColor: '#3f3f46',
    color: 'white',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const textAreaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: '96px',
    resize: 'vertical',
  }

  const helperStyle: CSSProperties = {
    color: '#a1a1aa',
    fontSize: '14px',
    marginTop: '6px',
  }

  const rowWrapStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  }

  const buttonStyle = (selected: boolean): CSSProperties => ({
    padding: '8px 12px',
    borderRadius: '9999px',
    border: '1px solid',
    borderColor: selected ? '#2563eb' : '#52525b',
    backgroundColor: selected ? '#2563eb' : '#3f3f46',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1.2,
    display: 'inline-block',
  })

  const dnaButtonStyle = (selected: boolean): CSSProperties => ({
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid',
    borderColor: selected ? '#2563eb' : '#52525b',
    backgroundColor: selected ? '#2563eb' : '#3f3f46',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    flex: 1,
    minWidth: '120px',
  })

  const actionButtonStyle: CSSProperties = {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #2563eb',
    backgroundColor: '#2563eb',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  }

  const secondaryActionButtonStyle: CSSProperties = {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #52525b',
    backgroundColor: '#3f3f46',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  }

  const generateButtonStyle: CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: loading ? '#1d4ed8aa' : '#2563eb',
    color: 'white',
    cursor: loading ? 'default' : 'pointer',
    fontSize: '16px',
    fontWeight: 600,
  }

  const outputCardStyle: CSSProperties = {
    backgroundColor: '#3f3f4699',
    borderRadius: '14px',
    padding: '16px',
    marginBottom: '16px',
  }

  const outputTitleStyle: CSSProperties = {
    fontWeight: 700,
    marginBottom: '8px',
  }

  const copyButtonStyle: CSSProperties = {
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid #52525b',
    backgroundColor: '#3f3f46',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
  }

  const emptyStateStyle: CSSProperties = {
    backgroundColor: '#3f3f4666',
    borderRadius: '14px',
    padding: '16px',
    color: '#d4d4d8',
  }

  const errorStyle: CSSProperties = {
    border: '1px solid #ef4444',
    backgroundColor: '#450a0a66',
    borderRadius: '14px',
    padding: '16px',
  }

  const responsiveStyle =
    typeof window !== 'undefined' && window.innerWidth < 980
      ? { gridTemplateColumns: '1fr' }
      : {}

  const renderSingleVersion = (data: ResultType) => (
    <div>
      <div style={outputCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={outputTitleStyle}>Style (Short)</div>
          <button
            onClick={() => copyToClipboard(data.style_short || '')}
            style={copyButtonStyle}
          >
            Copy
          </button>
        </div>
        <div>{data.style_short}</div>
      </div>

      <div style={outputCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={outputTitleStyle}>Style (Detailed)</div>
          <button
            onClick={() => copyToClipboard(data.style_detailed || '')}
            style={copyButtonStyle}
          >
            Copy
          </button>
        </div>
        <div>{data.style_detailed}</div>
      </div>

      {data.lyrics_full && (
        <div style={outputCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={outputTitleStyle}>Full Lyrics</div>
            <button
              onClick={() => copyToClipboard(data.lyrics_full || '')}
              style={copyButtonStyle}
            >
              Copy
            </button>
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              margin: 0,
              fontFamily: 'inherit',
              lineHeight: '1.6',
            }}
          >
            {data.lyrics_full}
          </pre>
        </div>
      )}

      {data.lyrics_brief && (
        <div style={outputCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={outputTitleStyle}>Lyrics Brief</div>
            <button
              onClick={() => copyToClipboard(data.lyrics_brief || '')}
              style={copyButtonStyle}
            >
              Copy
            </button>
          </div>
          <div>{data.lyrics_brief}</div>
        </div>
      )}
    </div>
  )

  const renderVideoVersion = (video: VideoVersion) => (
    <div>
      <div style={outputCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={outputTitleStyle}>Global Style</div>
          <button
            onClick={() => copyToClipboard(video.global_style || '')}
            style={copyButtonStyle}
          >
            Copy
          </button>
        </div>
        <div>{video.global_style}</div>
      </div>

      <div style={outputCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={outputTitleStyle}>Character Prompt</div>
          <button
            onClick={() => copyToClipboard(video.character_prompt || '')}
            style={copyButtonStyle}
          >
            Copy
          </button>
        </div>
        <div>{video.character_prompt}</div>
      </div>

      <div style={outputCardStyle}>
        <div style={outputTitleStyle}>Video Concept</div>
        <div>{video.video_concept}</div>
      </div>

      {video.scene_prompts?.map((scene, index) => (
        <div key={`${scene.section}-${index}`} style={outputCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={outputTitleStyle}>{scene.section}</div>
            <button
              onClick={() => copyToClipboard(scene.prompt || '')}
              style={copyButtonStyle}
            >
              Copy
            </button>
          </div>
          <div>{scene.prompt}</div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={pageStyle}>
      <h1 style={headerStyle}>🎸 Suno Prompt Studio</h1>
      <p style={subHeaderStyle}>
        Build Suno-ready style prompts, full lyrics, and OpenArt-ready video prompts using your creative DNA.
      </p>

      <div style={{ ...layoutStyle, ...responsiveStyle }}>
        <div style={panelStyle}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>
            Song Idea
          </h2>

          <div style={sectionStyle}>
            <label style={labelStyle}>Creative DNA</label>
            <div style={rowWrapStyle}>
              {dnaOptions.map((dna) => {
                const selected = form.dnaId === dna.id
                return (
                  <button
                    key={dna.id}
                    type="button"
                    onClick={() => setForm({ ...form, dnaId: dna.id })}
                    style={dnaButtonStyle(selected)}
                  >
                    {dna.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Genre</label>
            <div style={rowWrapStyle}>
              {genreOptions.map((genre) => {
                const selected = form.genre === genre
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setForm({ ...form, genre })}
                    style={buttonStyle(selected)}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Mood</label>
            <div style={rowWrapStyle}>
              {moodOptions.map((mood) => {
                const selected = form.moods.includes(mood)
                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    style={buttonStyle(selected)}
                  >
                    {mood}
                  </button>
                )
              })}
            </div>
            <div style={helperStyle}>You can choose more than one mood.</div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Theme Idea</label>
            <textarea
              placeholder="What is this song really about?"
              style={textAreaStyle}
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
            />
            <div style={helperStyle}>
              Start with a rough idea. The app can suggest alternative angles.
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSuggestThemes}
                disabled={themeLoading || !form.theme.trim()}
                style={{
                  ...actionButtonStyle,
                  opacity: themeLoading || !form.theme.trim() ? 0.6 : 1,
                  cursor: themeLoading || !form.theme.trim() ? 'default' : 'pointer',
                }}
              >
                {themeLoading ? 'Suggesting...' : 'Suggest Related Ideas'}
              </button>
            </div>

            {refinedTheme && (
              <div style={{ ...outputCardStyle, marginTop: '16px', marginBottom: '12px' }}>
                <div style={outputTitleStyle}>Refined Theme</div>
                <div>{refinedTheme}</div>
              </div>
            )}

            {themeIdeas.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ ...labelStyle, marginBottom: '8px' }}>Related Ideas</div>
                <div style={rowWrapStyle}>
                  {themeIdeas.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setForm({ ...form, theme: idea })}
                      style={buttonStyle(form.theme === idea)}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Hook</label>
            <div style={helperStyle}>
              Generate hook ideas from your theme, or type your own.
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSuggestHooks}
                disabled={hookLoading || !form.theme.trim()}
                style={{
                  ...actionButtonStyle,
                  opacity: hookLoading || !form.theme.trim() ? 0.6 : 1,
                  cursor: hookLoading || !form.theme.trim() ? 'default' : 'pointer',
                }}
              >
                {hookLoading ? 'Generating...' : 'Suggest Hooks'}
              </button>

              <button
                type="button"
                onClick={handleSuggestHooks}
                disabled={hookLoading || !form.theme.trim()}
                style={{
                  ...secondaryActionButtonStyle,
                  opacity: hookLoading || !form.theme.trim() ? 0.6 : 1,
                  cursor: hookLoading || !form.theme.trim() ? 'default' : 'pointer',
                }}
              >
                Regenerate Hooks
              </button>
            </div>

            {hookIdeas.length > 0 && (
              <div style={{ ...rowWrapStyle, marginTop: '12px', marginBottom: '12px' }}>
                {hookIdeas.map((suggestion) => {
                  const selected = form.hook === suggestion
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setForm({ ...form, hook: suggestion })}
                      style={buttonStyle(selected)}
                    >
                      {suggestion}
                    </button>
                  )
                })}
              </div>
            )}

            <input
              placeholder="Custom hook phrase"
              style={inputStyle}
              value={form.hook}
              onChange={(e) => setForm({ ...form, hook: e.target.value })}
            />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Lyric Direction Controls</label>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...helperStyle, marginBottom: '8px', marginTop: 0 }}>
                Style of language
              </div>
              <div style={rowWrapStyle}>
                {['Conversational', 'Balanced', 'Poetic'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setForm({ ...form, languageStyle: option })}
                    style={buttonStyle(form.languageStyle === option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...helperStyle, marginBottom: '8px', marginTop: 0 }}>
                Perspective
              </div>
              <div style={rowWrapStyle}>
                {['Personal', 'Balanced', 'Universal'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setForm({ ...form, perspective: option })}
                    style={buttonStyle(form.perspective === option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...helperStyle, marginBottom: '8px', marginTop: 0 }}>
                Song focus
              </div>
              <div style={rowWrapStyle}>
                {['Story', 'Balanced', 'Hook-driven'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setForm({ ...form, songFocus: option })}
                    style={buttonStyle(form.songFocus === option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...helperStyle, marginBottom: '8px', marginTop: 0 }}>
                Live-friendly phrasing
              </div>
              <div style={rowWrapStyle}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, liveFriendly: true })}
                  style={buttonStyle(form.liveFriendly === true)}
                >
                  On
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, liveFriendly: false })}
                  style={buttonStyle(form.liveFriendly === false)}
                >
                  Off
                </button>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Generation Mode</label>
            <div style={rowWrapStyle}>
              <button
                type="button"
                onClick={() => setForm({ ...form, multiVersion: false })}
                style={buttonStyle(form.multiVersion === false)}
              >
                Single Version
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, multiVersion: true })}
                style={buttonStyle(form.multiVersion === true)}
              >
                Multi-Version
              </button>
            </div>
            <div style={helperStyle}>
              Multi-Version generates MPJ Master, Commercial Hit, and Raw Folk side by side.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                ...generateButtonStyle,
                width: 'auto',
                flex: 1,
                minWidth: '180px',
              }}
            >
              {loading ? 'Generating...' : 'Generate Song'}
            </button>

            <button
              onClick={handleRewriteLyrics}
              disabled={rewritingLyrics || !result}
              style={{
                ...actionButtonStyle,
                opacity: rewritingLyrics || !result ? 0.6 : 1,
                cursor: rewritingLyrics || !result ? 'default' : 'pointer',
                minWidth: '180px',
              }}
            >
              {rewritingLyrics ? 'Rewriting...' : 'Rewrite Lyrics Only'}
            </button>

            <button
              onClick={handleGenerateVideo}
              disabled={videoLoading || !result}
              style={{
                ...secondaryActionButtonStyle,
                opacity: videoLoading || !result ? 0.6 : 1,
                cursor: videoLoading || !result ? 'default' : 'pointer',
                minWidth: '180px',
              }}
            >
              {videoLoading ? 'Generating Video...' : 'OpenArt Mode'}
            </button>

            <button
              onClick={handleSaveToFile}
              disabled={!result && !videoResult}
              style={{
                ...secondaryActionButtonStyle,
                opacity: !result && !videoResult ? 0.6 : 1,
                cursor: !result && !videoResult ? 'default' : 'pointer',
                minWidth: '180px',
              }}
            >
              Save Results to TXT
            </button>
          </div>
        </div>

        <div style={panelStyle}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>
            Output
          </h2>

          {result ? (
            result.error ? (
              <div style={errorStyle}>
                <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>
                  Error
                </div>
                <div>{result.error}</div>
              </div>
            ) : result.versions && result.versions.length > 0 ? (
              <div>
                {result.versions.map((version) => (
                  <div key={version.dna_id} style={{ ...outputCardStyle, backgroundColor: '#2f2f35' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                      {version.dna_name}
                    </div>
                    {renderSingleVersion(version)}
                  </div>
                ))}
              </div>
            ) : (
              renderSingleVersion(result)
            )
          ) : (
            <div style={emptyStateStyle}>No output yet</div>
          )}

          {videoResult && (
            <div style={{ marginTop: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>
                OpenArt Output
              </h2>

              {videoResult.error ? (
                <div style={errorStyle}>{videoResult.error}</div>
              ) : videoResult.versions && videoResult.versions.length > 0 ? (
                <div>
                  {videoResult.versions.map((video) => (
                    <div
                      key={video.dna_id}
                      style={{ ...outputCardStyle, backgroundColor: '#2f2f35' }}
                    >
                      <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                        {video.dna_name}
                      </div>
                      {renderVideoVersion(video)}
                    </div>
                  ))}
                </div>
              ) : (
                renderVideoVersion(videoResult)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}