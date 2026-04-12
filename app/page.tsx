'use client'
import { CSSProperties, useState } from 'react'

type ResultType = {
  style_short?: string
  style_detailed?: string
  lyrics_brief?: string
  lyrics_full?: string
  lyrics_template?: string
  error?: string
}

type ThemeIdeasResponse = {
  refined_theme?: string
  related_themes?: string[]
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

const hookSuggestions = [
  'I just want to come home',
  'Still standing here',
  'This road knows my name',
  'Hold on to me',
  'I won’t let go',
  'Somewhere back to you',
]

export default function Home() {
  const [form, setForm] = useState({
    genre: '',
    moods: [] as string[],
    theme: '',
    hook: '',
    dnaId: 'mpj-master',
  })

  const [result, setResult] = useState<ResultType | null>(null)
  const [loading, setLoading] = useState(false)

  const [themeIdeas, setThemeIdeas] = useState<string[]>([])
  const [refinedTheme, setRefinedTheme] = useState('')
  const [themeLoading, setThemeLoading] = useState(false)

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
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setResult(null)

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          genre: form.genre,
          moods: form.moods,
          theme: form.theme,
          hook: form.hook,
          dnaId: form.dnaId,
        }),
      })

      const text = await res.text()
      let data: ResultType

      try {
        data = JSON.parse(text)
      } catch {
        console.error('Non-JSON response:', text)
        setResult({ error: 'API route not found or returned HTML instead of JSON' })
        return
      }

      if (!res.ok) {
        setResult({ error: data.error || 'Something went wrong' })
        return
      }

      setResult(data)
    } catch (err) {
      console.error('Request failed:', err)
      setResult({ error: 'Request failed' })
    } finally {
      setLoading(false)
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

  return (
    <div style={pageStyle}>
      <h1 style={headerStyle}>🎸 Suno Prompt Studio COPY TEST</h1>
      <p style={subHeaderStyle}>
        Build Suno-ready style prompts and lyric  directions using your creative DNA.
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

            <div style={{ marginTop: '12px' }}>
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
            <div style={{ ...rowWrapStyle, marginBottom: '12px' }}>
              {hookSuggestions.map((suggestion) => {
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

            <input
              placeholder="Custom hook phrase"
              style={inputStyle}
              value={form.hook}
              onChange={(e) => setForm({ ...form, hook: e.target.value })}
            />
          </div>

          <button onClick={handleGenerate} disabled={loading} style={generateButtonStyle}>
            {loading ? 'Generating...' : 'Generate Song'}
          </button>
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
            ) : (
              <div>
                <div style={outputCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={outputTitleStyle}>Style (Short)</div>
                    <button
                      onClick={() => copyToClipboard(result.style_short || '')}
                      style={copyButtonStyle}
                    >
                      Copy
                    </button>
                  </div>
                  <div>{result.style_short}</div>
                </div>

                <div style={outputCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={outputTitleStyle}>Style (Detailed)</div>
                    <button
                      onClick={() => copyToClipboard(result.style_detailed || '')}
                      style={copyButtonStyle}
                    >
                      Copy
                    </button>
                  </div>
                  <div>{result.style_detailed}</div>
                </div>

                {result.lyrics_full && (
                  <div style={outputCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={outputTitleStyle}>Full Lyrics</div>
                      <button
                        onClick={() => copyToClipboard(result.lyrics_full || '')}
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
                      }}
                    >
                      {result.lyrics_full}
                    </pre>
                  </div>
                )}

                {result.lyrics_template && (
                  <div style={outputCardStyle}>
                    <div style={outputTitleStyle}>Lyrics Template</div>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                        fontFamily: 'inherit',
                      }}
                    >
                      {result.lyrics_template}
                    </pre>
                  </div>
                )}

                {result.lyrics_brief && (
                  <div style={outputCardStyle}>
                    <div style={outputTitleStyle}>Lyrics Brief</div>
                    <div>{result.lyrics_brief}</div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div style={emptyStateStyle}>No output yet</div>
          )}
        </div>
      </div>
    </div>
  )
}