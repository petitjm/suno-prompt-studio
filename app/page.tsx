'use client'

import React, { CSSProperties, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Project = {
  id: string
  title: string
  created_at?: string
}

type FormState = {
  genre: string
  moods: string[]
  theme: string
  hook: string
  dnaId: string
}

type GenerateResponse = {
  style_short?: string
  style_detailed?: string
  lyrics_brief?: string
  lyrics_full?: string
  lyrics_template?: string
  error?: string
}

type ChordResponse = {
  key?: string
  capo?: string
  verse?: string
  chorus?: string
  bridge?: string
  notes?: string
  error?: string
}

type SongVersionRecord = {
  id: string
  project_id: string
  title?: string
  form?: FormState
  result?: GenerateResponse
  created_at?: string
}

type ChordVersionRecord = {
  id: string
  project_id: string
  chord_data?: ChordResponse
  created_at?: string
}

type RewriteMode =
  | 'strengthen_chorus'
  | 'more_conversational'
  | 'more_poetic'
  | 'more_universal'
  | 'more_personal'
  | 'simplify_lyrics'
  | 'improve_opening_line'
  | 'tighten_live'

const defaultForm: FormState = {
  genre: '',
  moods: [],
  theme: '',
  hook: '',
  dnaId: 'mpj-master',
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

const rewriteButtons: Array<{ mode: RewriteMode; label: string }> = [
  { mode: 'strengthen_chorus', label: 'Strengthen Chorus' },
  { mode: 'more_conversational', label: 'More Conversational' },
  { mode: 'more_poetic', label: 'More Poetic' },
  { mode: 'more_universal', label: 'More Universal' },
  { mode: 'more_personal', label: 'More Personal' },
  { mode: 'simplify_lyrics', label: 'Simplify Lyrics' },
  { mode: 'improve_opening_line', label: 'Improve Opening Line' },
  { mode: 'tighten_live', label: 'Tighten for Live' },
]

export default function Home() {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [projectMessage, setProjectMessage] = useState('')

  const [form, setForm] = useState<FormState>(defaultForm)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [chords, setChords] = useState<ChordResponse | null>(null)

  const [songVersions, setSongVersions] = useState<SongVersionRecord[]>([])
  const [chordVersions, setChordVersions] = useState<ChordVersionRecord[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [chordLoading, setChordLoading] = useState(false)
  const [rewriteLoading, setRewriteLoading] = useState<RewriteMode | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setAuthLoading(true)
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setUser(data.session?.user ?? null)
      } catch (err) {
        console.error('Failed to load auth session', err)
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    void load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (user) {
      void loadProjects()
    } else {
      setProjects([])
      setActiveProject(null)
      setProjectMessage('')
      setSongVersions([])
      setChordVersions([])
      setResult(null)
      setChords(null)
      setForm(defaultForm)
    }
  }, [user])

  useEffect(() => {
    if (activeProject?.id) {
      void loadProjectData(activeProject.id)
    } else {
      setSongVersions([])
      setChordVersions([])
    }
  }, [activeProject?.id])

  const loadProjects = async () => {
    try {
      setProjectMessage('Loading projects...')
      const res = await fetch('/api/projects')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load projects')
      }

      const nextProjects: Project[] = Array.isArray(data.projects) ? data.projects : []
      setProjects(nextProjects)

      if (nextProjects.length > 0) {
        setActiveProject((prev: Project | null) =>
          prev
            ? nextProjects.find((p: Project) => p.id === prev.id) || nextProjects[0]
            : nextProjects[0]
        )
      } else {
        setActiveProject(null)
      }

      setProjectMessage('')
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to load projects')
    }
  }

  const loadProjectData = async (projectId: string) => {
    try {
      setVersionsLoading(true)
      setProjectMessage('Loading project data...')

      const [songRes, chordRes] = await Promise.all([
        fetch(`/api/song-versions/${projectId}`),
        fetch(`/api/chord-versions/${projectId}`),
      ])

      const songData = await songRes.json()
      const chordData = await chordRes.json()

      if (!songRes.ok) {
        throw new Error(songData.error || 'Failed to load song versions')
      }

      if (!chordRes.ok) {
        throw new Error(chordData.error || 'Failed to load chord versions')
      }

      const nextSongVersions: SongVersionRecord[] = Array.isArray(songData.versions)
        ? songData.versions
        : []
      const nextChordVersions: ChordVersionRecord[] = Array.isArray(chordData.versions)
        ? chordData.versions
        : []

      setSongVersions(nextSongVersions)
      setChordVersions(nextChordVersions)

      if (songData.latest?.result) {
        setResult(songData.latest.result)
      } else {
        setResult(null)
      }

      if (songData.latest?.form) {
        setForm({
          genre: songData.latest.form.genre || '',
          moods: Array.isArray(songData.latest.form.moods) ? songData.latest.form.moods : [],
          theme: songData.latest.form.theme || '',
          hook: songData.latest.form.hook || '',
          dnaId: songData.latest.form.dnaId || 'mpj-master',
        })
      }

      if (chordData.latest?.chord_data) {
        setChords(chordData.latest.chord_data)
      } else {
        setChords(null)
      }

      setProjectMessage('')
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to load project data')
    } finally {
      setVersionsLoading(false)
    }
  }

  const createProject = async () => {
    const title = newProjectName.trim()
    if (!title) {
      setProjectMessage('Enter a project name first.')
      return
    }

    try {
      setProjectMessage('Creating project...')

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      setProjects((prev) => [data, ...prev])
      setActiveProject(data)
      setNewProjectName('')
      setProjectMessage('Project created')
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to create project')
    }
  }

  const sendCode = async () => {
    try {
      setAuthMessage('')
      const email = emailInput.trim()
      if (!email) {
        setAuthMessage('Enter your email first.')
        return
      }

      const { error } = await supabase.auth.signInWithOtp({ email })
      setAuthMessage(error ? error.message : 'Code sent. Check your email.')
    } catch (err) {
      console.error(err)
      setAuthMessage('Failed to send code.')
    }
  }

  const verifyCode = async () => {
    try {
      setAuthMessage('')

      const email = emailInput.trim()
      const token = otpInput.trim()

      if (!email || !token) {
        setAuthMessage('Enter both email and code.')
        return
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      setAuthMessage(error ? error.message : 'Signed in successfully.')
      if (!error) setOtpInput('')
    } catch (err) {
      console.error(err)
      setAuthMessage('Failed to verify code.')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProjects([])
    setActiveProject(null)
    setResult(null)
    setChords(null)
    setAuthMessage('')
    setProjectMessage('')
    setSongVersions([])
    setChordVersions([])
    setForm(defaultForm)
  }

  const toggleMood = (mood: string) => {
    setForm((prev) => ({
      ...prev,
      moods: prev.moods.includes(mood)
        ? prev.moods.filter((m) => m !== mood)
        : [...prev.moods, mood],
    }))
  }

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setResult(null)

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setResult(data)

      if (activeProject) {
        const saveRes = await fetch('/api/song-versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: activeProject.id,
            title: form.theme || form.hook || 'Untitled Version',
            form,
            result: data,
          }),
        })

        if (!saveRes.ok) {
          const saveData = await saveRes.json().catch(() => ({}))
          console.error('Failed to save song version', saveData)
        } else {
          await loadProjectData(activeProject.id)
        }
      }
    } catch (err: any) {
      console.error(err)
      setResult({ error: err.message || 'Generation failed' })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateChords = async () => {
    try {
      setChordLoading(true)
      setChords(null)

      const res = await fetch('/api/chords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_id: activeProject?.id || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Chord generation failed')
      }

      setChords(data)

      if (activeProject) {
        await loadProjectData(activeProject.id)
      }
    } catch (err: any) {
      console.error(err)
      setChords({ error: err.message || 'Chord generation failed' })
    } finally {
      setChordLoading(false)
    }
  }

  const handleRewrite = async (mode: RewriteMode, label: string) => {
    try {
      if (!result?.lyrics_full) {
        setResult({ error: 'Generate or load lyrics before rewriting.' })
        return
      }

      setRewriteLoading(mode)

      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          versionTitle: label,
          currentLyrics: result.lyrics_full,
          genre: form.genre,
          moods: form.moods,
          theme: form.theme,
          hook: form.hook,
          dnaId: form.dnaId,
          project_id: activeProject?.id || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Rewrite failed')
      }

      setResult(data)

      if (activeProject) {
        await loadProjectData(activeProject.id)
      }
    } catch (err: any) {
      console.error(err)
      setResult({ error: err.message || 'Rewrite failed' })
    } finally {
      setRewriteLoading(null)
    }
  }

  const loadSongVersion = (version: SongVersionRecord) => {
    if (version.form) {
      setForm({
        genre: version.form.genre || '',
        moods: Array.isArray(version.form.moods) ? version.form.moods : [],
        theme: version.form.theme || '',
        hook: version.form.hook || '',
        dnaId: version.form.dnaId || 'mpj-master',
      })
    }

    setResult(version.result || null)
  }

  const loadChordVersion = (version: ChordVersionRecord) => {
    setChords(version.chord_data || null)
  }

  const pageStyle: CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    background: '#18181b',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
  }

  const sidebarStyle: CSSProperties = {
    width: 280,
    borderRight: '1px solid #333',
    padding: 16,
    background: '#111113',
  }

  const mainStyle: CSSProperties = {
    flex: 1,
    padding: 24,
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    border: '1px solid #444',
    background: '#3f3f46',
    color: 'white',
    boxSizing: 'border-box',
  }

  const textareaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: 100,
    resize: 'vertical',
  }

  const primaryButtonStyle: CSSProperties = {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: 'white',
    cursor: 'pointer',
  }

  const secondaryButtonStyle: CSSProperties = {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #52525b',
    background: '#3f3f46',
    color: 'white',
    cursor: 'pointer',
  }

  const chipStyle = (selected: boolean): CSSProperties => ({
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid',
    borderColor: selected ? '#2563eb' : '#52525b',
    background: selected ? '#2563eb' : '#3f3f46',
    color: 'white',
    cursor: 'pointer',
  })

  const panelStyle: CSSProperties = {
    background: '#27272a',
    padding: 20,
    borderRadius: 16,
  }

  const sectionTitleStyle: CSSProperties = {
    display: 'block',
    marginBottom: 8,
    fontWeight: 700,
  }

  const historyItemStyle: CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    textAlign: 'left',
    borderRadius: 10,
    border: '1px solid #3f3f46',
    background: '#1f1f23',
    color: 'white',
    cursor: 'pointer',
  }

  return (
    <div style={pageStyle}>
      <div style={sidebarStyle}>
        <h3 style={{ marginTop: 0 }}>Projects</h3>

        {authLoading ? (
          <div style={{ color: '#a1a1aa', fontSize: 14 }}>Checking sign-in status...</div>
        ) : !user ? (
          <div style={{ color: '#a1a1aa', fontSize: 14 }}>
            Sign in to create and manage projects.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                placeholder="New project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{ ...inputStyle, padding: '10px 12px', flex: 1 }}
              />
              <button onClick={createProject} style={primaryButtonStyle}>
                +
              </button>
            </div>

            {projectMessage && (
              <div style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 10 }}>
                {projectMessage}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveProject(p)}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: activeProject?.id === p.id ? '#2563eb' : '#27272a',
                    color: 'white',
                    border: '1px solid #3f3f46',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  {p.created_at ? (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {new Date(p.created_at).toLocaleString()}
                    </div>
                  ) : null}
                </button>
              ))}

              {projects.length === 0 && !projectMessage && (
                <div style={{ color: '#a1a1aa', fontSize: 14 }}>No projects yet.</div>
              )}
            </div>
          </>
        )}
      </div>

      <div style={mainStyle}>
        <h1 style={{ marginTop: 0 }}>Suno Prompt Studio</h1>

        {!user ? (
          <div style={{ ...panelStyle, marginBottom: 24 }}>
            <h2 style={{ marginTop: 0 }}>Sign in</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                placeholder="Email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
              <button onClick={sendCode} style={primaryButtonStyle}>
                Send Code
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Code"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
              <button onClick={verifyCode} style={secondaryButtonStyle}>
                Verify
              </button>
            </div>

            {authMessage && <div style={{ color: '#a1a1aa' }}>{authMessage}</div>}
          </div>
        ) : (
          <div style={{ ...panelStyle, marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}>
              Logged in as <strong>{user.email}</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              Active project: <strong>{activeProject ? activeProject.title : 'None selected'}</strong>
            </div>
            {versionsLoading && (
              <div style={{ color: '#a1a1aa', marginBottom: 12 }}>Loading project history...</div>
            )}
            <button onClick={signOut} style={secondaryButtonStyle}>
              Sign out
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 1fr) minmax(340px, 1fr)',
            gap: 24,
          }}
        >
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Song Builder</h2>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Creative DNA</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {dnaOptions.map((dna) => (
                  <button
                    key={dna.id}
                    type="button"
                    onClick={() => setForm({ ...form, dnaId: dna.id })}
                    style={chipStyle(form.dnaId === dna.id)}
                  >
                    {dna.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Genre</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setForm({ ...form, genre })}
                    style={chipStyle(form.genre === genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Mood</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {moodOptions.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    style={chipStyle(form.moods.includes(mood))}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Theme</label>
              <textarea
                placeholder="What is this song about?"
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                style={textareaStyle}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Hook</label>
              <input
                placeholder="Hook phrase"
                value={form.hook}
                onChange={(e) => setForm({ ...form, hook: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
              <button onClick={handleGenerate} disabled={loading} style={primaryButtonStyle}>
                {loading ? 'Generating...' : 'Generate Song'}
              </button>

              <button
                onClick={handleGenerateChords}
                disabled={chordLoading}
                style={secondaryButtonStyle}
              >
                {chordLoading ? 'Generating Chords...' : 'Generate Chords'}
              </button>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h3 style={{ marginTop: 0 }}>Rewrite Lab</h3>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {rewriteButtons.map((button) => (
                  <button
                    key={button.mode}
                    onClick={() => handleRewrite(button.mode, button.label)}
                    disabled={rewriteLoading !== null}
                    style={secondaryButtonStyle}
                  >
                    {rewriteLoading === button.mode ? 'Rewriting...' : button.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h3 style={{ marginTop: 0 }}>Song Version History</h3>

              {songVersions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {songVersions.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => loadSongVersion(version)}
                      style={historyItemStyle}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {version.title || 'Untitled Version'}
                      </div>
                      {version.created_at && (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          {new Date(version.created_at).toLocaleString()}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#a1a1aa' }}>No saved song versions yet.</div>
              )}
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Output</h2>

            {result ? (
              result.error ? (
                <div style={{ color: '#f87171', marginBottom: 20 }}>{result.error}</div>
              ) : (
                <>
                  {result.style_short && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Style (Short)</div>
                      <div>{result.style_short}</div>
                    </div>
                  )}

                  {result.style_detailed && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Style (Detailed)</div>
                      <div>{result.style_detailed}</div>
                    </div>
                  )}

                  {result.lyrics_brief && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Lyrics Brief</div>
                      <div>{result.lyrics_brief}</div>
                    </div>
                  )}

                  {result.lyrics_full && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Full Lyrics</div>
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          margin: 0,
                          fontFamily: 'inherit',
                          lineHeight: 1.6,
                        }}
                      >
                        {result.lyrics_full}
                      </pre>
                    </div>
                  )}
                </>
              )
            ) : (
              <div style={{ color: '#a1a1aa', marginBottom: 20 }}>No song output yet</div>
            )}

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h2 style={{ marginTop: 0 }}>Chord Engine</h2>

              {chords ? (
                chords.error ? (
                  <div style={{ color: '#f87171', marginBottom: 20 }}>{chords.error}</div>
                ) : (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <strong>Key:</strong> {chords.key || '—'}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <strong>Capo:</strong> {chords.capo || '—'}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Verse</div>
                      <div>{chords.verse || '—'}</div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Chorus</div>
                      <div>{chords.chorus || '—'}</div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Bridge</div>
                      <div>{chords.bridge || '—'}</div>
                    </div>

                    {chords.notes && (
                      <div style={{ color: '#d4d4d8', fontStyle: 'italic', marginBottom: 20 }}>
                        {chords.notes}
                      </div>
                    )}
                  </>
                )
              ) : (
                <div style={{ color: '#a1a1aa', marginBottom: 20 }}>No chord output yet</div>
              )}

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
                <h3 style={{ marginTop: 0 }}>Chord History</h3>

                {chordVersions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chordVersions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => loadChordVersion(version)}
                        style={historyItemStyle}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {version.chord_data?.key || 'Chord Set'}
                        </div>
                        {version.created_at && (
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            {new Date(version.created_at).toLocaleString()}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#a1a1aa' }}>No saved chord versions yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}