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
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  // ---------------- PROJECTS ----------------

  const loadProjects = async () => {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data.projects || [])
  }

  useEffect(() => {
    if (user) loadProjects()
  }, [user])

  const createProject = async () => {
    if (!newProjectName.trim()) return

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newProjectName }),
    })

    const data = await res.json()
    setProjects((prev) => [data, ...prev])
    setActiveProject(data)
    setNewProjectName('')
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
    setProjects([])
    setActiveProject(null)
  }

  // ---------------- GENERATE ----------------

  const handleGenerate = async () => {
    try {
      setLoading(true)

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      setResult(data)

      // 🔥 SAVE TO PROJECT
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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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

        {/* AUTH */}
        {!user ? (
          <div style={{ marginBottom: 20 }}>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button onClick={sendCode}>Send Code</button>

            <div>
              <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
              <button onClick={verifyCode}>Verify</button>
            </div>

            <div>{message}</div>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            Logged in as {user.email}
            <button onClick={signOut}>Sign out</button>
          </div>
        )}

        {/* FORM */}
        <div style={{ marginBottom: 20 }}>
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

          <button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Song'}
          </button>
        </div>

        {/* RESULT */}
        {result && (
          <div style={{ background: '#27272a', padding: 16 }}>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}