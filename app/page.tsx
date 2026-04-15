'use client'

import React, { useEffect, useMemo, useState } from 'react'
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

export default function Home() {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')

  const [form, setForm] = useState<FormState>(defaultForm)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [chords, setChords] = useState<ChordResponse | null>(null)

  const [loading, setLoading] = useState(false)
  const [chordLoading, setChordLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user ?? null)
    }

    void load()

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Failed to load projects', err)
    }
  }

  useEffect(() => {
    if (user) {
      void loadProjects()
    } else {
      setProjects([])
      setActiveProject(null)
    }
  }, [user])

  const createProject = async () => {
    if (!newProjectName.trim()) return

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProjectName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      setProjects((prev) => [data, ...prev])
      setActiveProject(data)
      setNewProjectName('')
    } catch (err) {
      console.error('Failed to create project', err)
    }
  }

  const sendCode = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setMessage('Enter your email first.')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({ email: trimmedEmail })
    setMessage(error ? error.message : 'Code sent')
  }

  const verifyCode = async () => {
    const trimmedEmail = email.trim()
    const trimmedCode = code.trim()

    if (!trimmedEmail || !trimmedCode) {
      setMessage('Enter both email and code.')
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedCode,
      type: 'email',
    })

    setMessage(error ? error.message : 'Signed in')
    if (!error) setCode('')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProjects([])
    setActiveProject(null)
    setResult(null)
    setChords(null)
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
        await fetch('/api/song-versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: activeProject.id,
            title: form.theme || form.hook || 'Untitled Version',
            form,
            result: data,
          }),
        })
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
    } catch (err: any) {
      console.error(err)
      setChords({ error: err.message || 'Chord generation failed' })
    } finally {
      setChordLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#18181b',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: 280,
          borderRight: '1px solid #333',
          padding: 16,
          background: '#111113',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Projects</h3>

        {!user ? (
          <div style={{ color: '#a1a1aa', fontSize: 14 }}>
            Sign in to create and manage projects.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <input
                placeholder="New project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#27272a',
                  color: 'white',
                }}
              />
              <button
                onClick={createProject}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #2563eb',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>

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
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Suno Prompt Studio</h1>

        {!user ? (
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              background: '#27272a',
              borderRadius: 14,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Sign in</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 220,
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#3f3f46',
                  color: 'white',
                }}
              />
              <button
                onClick={sendCode}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #2563eb',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Send Code
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 220,
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#3f3f46',
                  color: 'white',
                }}
              />
              <button
                onClick={verifyCode}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #52525b',
                  background: '#3f3f46',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Verify
              </button>
            </div>

            <div style={{ color: '#a1a1aa' }}>{message}</div>
          </div>
        ) : (
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              background: '#27272a',
              borderRadius: 14,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              Logged in as <strong>{user.email}</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              Active project:{' '}
              <strong>{activeProject ? activeProject.title : 'None selected'}</strong>
            </div>
            <button
              onClick={signOut}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #52525b',
                background: '#3f3f46',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
          }}
        >
          <div
            style={{
              background: '#27272a',
              padding: 20,
              borderRadius: 16,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Song Builder</h2>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>
                Creative DNA
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {dnaOptions.map((dna) => (
                  <button
                    key={dna.id}
                    type="button"
                    onClick={() => setForm({ ...form, dnaId: dna.id })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid',
                      borderColor: form.dnaId === dna.id ? '#2563eb' : '#52525b',
                      background: form.dnaId === dna.id ? '#2563eb' : '#3f3f46',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {dna.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>
                Genre
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setForm({ ...form, genre })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid',
                      borderColor: form.genre === genre ? '#2563eb' : '#52525b',
                      background: form.genre === genre ? '#2563eb' : '#3f3f46',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>
                Mood
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {moodOptions.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid',
                      borderColor: form.moods.includes(mood) ? '#2563eb' : '#52525b',
                      background: form.moods.includes(mood) ? '#2563eb' : '#3f3f46',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>
                Theme
              </label>
              <textarea
                placeholder="What is this song about?"
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: 90,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#3f3f46',
                  color: 'white',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>
                Hook
              </label>
              <input
                placeholder="Hook phrase"
                value={form.hook}
                onChange={(e) => setForm({ ...form, hook: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#3f3f46',
                  color: 'white',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid #2563eb',
                  background: '#2563eb',
                  color: 'white',
                  cursor: loading ? 'default' : 'pointer',
                }}
              >
                {loading ? 'Generating...' : 'Generate Song'}
              </button>

              <button
                onClick={handleGenerateChords}
                disabled={chordLoading}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid #52525b',
                  background: '#3f3f46',
                  color: 'white',
                  cursor: chordLoading ? 'default' : 'pointer',
                }}
              >
                {chordLoading ? 'Generating Chords...' : 'Generate Chords'}
              </button>
            </div>
          </div>

          <div
            style={{
              background: '#27272a',
              padding: 20,
              borderRadius: 16,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Output</h2>

            {result ? (
              result.error ? (
                <div style={{ color: '#f87171' }}>{result.error}</div>
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
                    <div style={{ marginBottom: 16 }}>
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
              <div style={{ color: '#a1a1aa' }}>No song output yet</div>
            )}

            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #3f3f46',
              }}
            >
              <h2 style={{ marginTop: 0 }}>Chord Engine</h2>

              {chords ? (
                chords.error ? (
                  <div style={{ color: '#f87171' }}>{chords.error}</div>
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
                      <div style={{ color: '#d4d4d8', fontStyle: 'italic' }}>{chords.notes}</div>
                    )}
                  </>
                )
              ) : (
                <div style={{ color: '#a1a1aa' }}>No chord output yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}