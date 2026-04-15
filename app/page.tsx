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

type GenerateResponse = any
type ChordResponse = any

const defaultForm: FormState = {
  genre: '',
  moods: [],
  theme: '',
  hook: '',
  dnaId: 'mpj-master',
}

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

  const [debug, setDebug] = useState<string>('')

  // ---------------- AUTH ----------------

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user ?? null)
    }

    load()

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [supabase])

  // ---------------- PROJECTS ----------------

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error(err)
      setDebug('Failed to load projects')
    }
  }

  useEffect(() => {
    if (user) loadProjects()
  }, [user])

  const createProject = async () => {
    if (!newProjectName.trim()) return

    try {
      setDebug('Creating project...')

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProjectName }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Create failed')
      }

      setProjects((prev) => [data, ...prev])
      setActiveProject(data)
      setNewProjectName('')
      setDebug('Project created')
    } catch (err: any) {
      console.error(err)
      setDebug(err.message)
    }
  }

  // ---------------- AUTH ACTIONS ----------------

  const sendCode = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    setMessage(error ? error.message : 'Code sent')
  }

  const verifyCode = async () => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    setMessage(error ? error.message : 'Signed in')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // ---------------- GENERATE ----------------

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setDebug('Generating song...')

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      setResult(data)

      if (activeProject) {
        await fetch('/api/song-versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: activeProject.id,
            title: form.theme || form.hook,
            form,
            result: data,
          }),
        })
      }

      setDebug('Song generated')
    } catch (err: any) {
      console.error(err)
      setDebug(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ---------------- CHORDS ----------------

  const handleGenerateChords = async () => {
    try {
      setChordLoading(true)
      setDebug('Generating chords...')

      const res = await fetch('/api/chords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_id: activeProject?.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Chord generation failed')
      }

      setChords(data)
      setDebug('Chords generated')
    } catch (err: any) {
      console.error(err)
      setDebug(err.message)
    } finally {
      setChordLoading(false)
    }
  }

  // ---------------- UI ----------------

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#18181b', color: 'white' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: 260, borderRight: '1px solid #333', padding: 16 }}>
        <h3>Projects</h3>

        {user && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                placeholder="New project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button onClick={createProject}>+</button>
            </div>

            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => setActiveProject(p)}
                style={{
                  padding: 8,
                  marginBottom: 6,
                  cursor: 'pointer',
                  background: activeProject?.id === p.id ? '#2563eb' : '#27272a',
                  borderRadius: 6,
                }}
              >
                {p.title}
              </div>
            ))}
          </>
        )}
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: 24 }}>
        <h1>Suno Prompt Studio</h1>

        <div style={{ marginBottom: 10, color: '#a1a1aa' }}>{debug}</div>

        {!user ? (
          <div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
            <button onClick={sendCode}>Send Code</button>

            <input value={code} onChange={(e) => setCode(e.target.value)} />
            <button onClick={verifyCode}>Verify</button>

            <div>{message}</div>
          </div>
        ) : (
          <div>
            Logged in as {user.email}
            <button onClick={signOut}>Sign out</button>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <input
            placeholder="Theme"
            value={form.theme}
            onChange={(e) => setForm({ ...form, theme: e.target.value })}
          />

          <input
            placeholder="Hook"
            value={form.hook}
            onChange={(e) => setForm({ ...form, hook: e.target.value })}
          />

          <div style={{ marginTop: 10 }}>
            <button onClick={handleGenerate}>
              {loading ? 'Generating...' : 'Generate Song'}
            </button>

            <button onClick={handleGenerateChords}>
              {chordLoading ? 'Generating Chords...' : 'Generate Chords'}
            </button>
          </div>
        </div>

        {result && (
          <pre style={{ marginTop: 20 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        {chords && (
          <pre style={{ marginTop: 20 }}>
            {JSON.stringify(chords, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}