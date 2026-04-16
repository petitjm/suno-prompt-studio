'use client'

import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ---------------- TYPES ---------------- */

type Project = {
  id: string
  title: string
  created_at?: string
  updated_at?: string
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
  title?: string
  form?: FormState
  result?: GenerateResponse
  created_at?: string
}

type ChordVersionRecord = {
  id: string
  chord_data?: ChordResponse
  created_at?: string
}

/* ---------------- HELPERS ---------------- */

async function readJsonSafe(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Non-JSON response from ${res.url}`)
  }
}

/* ✅ UK timezone-safe formatter (handles BST automatically) */
function formatUkDateTime(value?: string) {
  if (!value) return ''

  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/* ---------------- COMPONENT ---------------- */

export default function Home() {
  const supabase = useMemo(() => createClient(), [])
  const latestProjectLoadRef = useRef(0)

  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  const [form, setForm] = useState<FormState>({
    genre: '',
    moods: [],
    theme: '',
    hook: '',
    dnaId: 'mpj-master',
  })

  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [chords, setChords] = useState<ChordResponse | null>(null)

  const [songVersions, setSongVersions] = useState<SongVersionRecord[]>([])
  const [chordVersions, setChordVersions] = useState<ChordVersionRecord[]>([])

  const [loading, setLoading] = useState(false)
  const [chordLoading, setChordLoading] = useState(false)

  const [newProjectName, setNewProjectName] = useState('')
  const [message, setMessage] = useState('')

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })

    return () => sub.subscription.unsubscribe()
  }, [supabase])

  /* ---------------- LOAD PROJECTS ---------------- */

  const loadProjects = async () => {
    const res = await fetch('/api/projects')
    const data = await readJsonSafe(res)
    setProjects(data.projects || [])
    if (data.projects?.length) setActiveProject(data.projects[0])
  }

  useEffect(() => {
    if (user) loadProjects()
  }, [user])

  /* ---------------- LOAD PROJECT DATA ---------------- */

  const loadProjectData = async (projectId: string) => {
    const token = Date.now()
    latestProjectLoadRef.current = token

    const [songRes, chordRes] = await Promise.all([
      fetch(`/api/song-versions/${projectId}`),
      fetch(`/api/chord-versions/${projectId}`),
    ])

    const songData = await readJsonSafe(songRes)
    const chordData = await readJsonSafe(chordRes)

    if (latestProjectLoadRef.current !== token) return

    setSongVersions(songData.versions || [])
    setChordVersions(chordData.versions || [])

    setResult(songData.latest?.result || null)
    setChords(chordData.latest?.chord_data || null)
  }

  useEffect(() => {
    if (activeProject) loadProjectData(activeProject.id)
  }, [activeProject?.id])

  /* ---------------- ACTIONS ---------------- */

  const createProject = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title: newProjectName }),
    })
    const data = await readJsonSafe(res)
    setProjects((p) => [data, ...p])
    setActiveProject(data)
    setNewProjectName('')
  }

  const generateSong = async () => {
    setLoading(true)

    const res = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify(form),
    })

    const data = await readJsonSafe(res)
    setResult(data)

    if (activeProject) {
      await fetch('/api/song-versions', {
        method: 'POST',
        body: JSON.stringify({
          project_id: activeProject.id,
          form,
          result: data,
        }),
      })
      await loadProjects()
      await loadProjectData(activeProject.id)
    }

    setLoading(false)
  }

  const generateChords = async () => {
    setChordLoading(true)

    const res = await fetch('/api/chords', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        project_id: activeProject?.id,
      }),
    })

    const data = await readJsonSafe(res)
    setChords(data)

    if (activeProject) {
      await loadProjects()
      await loadProjectData(activeProject.id)
    }

    setChordLoading(false)
  }

  /* ---------------- UI ---------------- */

  const sidebarStyle: CSSProperties = {
    width: 280,
    padding: 16,
    borderRight: '1px solid #333',
  }

  const mainStyle: CSSProperties = {
    flex: 1,
    padding: 24,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111', color: 'white' }}>
      
      {/* ---------------- SIDEBAR ---------------- */}
      <div style={sidebarStyle}>
        <h3>Projects</h3>

        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <button onClick={createProject}>+</button>
        </div>

        <div style={{ marginTop: 12 }}>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 6,
                background: activeProject?.id === p.id ? '#2563eb' : '#222',
                color: 'white',
              }}
            >
              <div>{p.title}</div>

              {/* ✅ FIXED UK TIME */}
              <div style={{ fontSize: 12 }}>
                Last updated: {formatUkDateTime(p.updated_at || p.created_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- MAIN ---------------- */}
      <div style={mainStyle}>
        <h1>Suno Prompt Studio</h1>

        <button onClick={generateSong}>
          {loading ? 'Generating...' : 'Generate Song'}
        </button>

        <button onClick={generateChords}>
          {chordLoading ? 'Chords...' : 'Generate Chords'}
        </button>

        {/* SONG OUTPUT */}
        <h2>Output</h2>
        <pre>{result?.lyrics_full || 'No output yet'}</pre>

        {/* CHORD OUTPUT */}
        <h2>Chords</h2>
        <pre>{JSON.stringify(chords, null, 2)}</pre>

        {/* SONG HISTORY */}
        <h3>Song History</h3>
        {songVersions.map((v) => (
          <div key={v.id}>
            {v.title || 'Version'} — {formatUkDateTime(v.created_at)}
          </div>
        ))}

        {/* CHORD HISTORY */}
        <h3>Chord History</h3>
        {chordVersions.map((v) => (
          <div key={v.id}>
            {v.chord_data?.key || 'Chord Set'} — {formatUkDateTime(v.created_at)}
          </div>
        ))}
      </div>
    </div>
  )
}