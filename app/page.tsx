
'use client'


import LegacyRehearseUI from '@/components/LegacyRehearseUI'
import React, { useState } from 'react'
import type { PreviewFeel, PreviewInstrument, PreviewPattern, PreviewSectionKey } from '@/types/song'
import RehearsePanel from '@/components/RehearsePanel'
import { buildPreviewBars } from '@/lib/parseSong'
import type { ChordResponse } from '@/types/song'
import * as Tone from 'tone'

// ===============================
// TYPES
// ===============================

type AppMode =
  | 'write'
  | 'chords'
  | 'sheet'
  | 'rehearse'
  | 'perform'
  | 'video'

// ===============================
// TOOLTIP COMPONENT (simple + clean)
// ===============================

function Tooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="relative group flex items-center justify-center">
      {children}
      <div className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 z-50">
        {label}
      </div>
    </div>
  )
}

// ===============================
// SIDEBAR ITEM
// ===============================

function SidebarItem({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <Tooltip label={label}>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition
        ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
      >
        <span className="text-lg">{icon}</span>
        {!collapsed && <span className="text-sm">{label}</span>}
      </button>
    </Tooltip>
  )
}

// ===============================
// MAIN PAGE
// ===============================

export default function Page() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mode, setMode] = useState<AppMode>('write')
  const startPreviewPlayback = async () => {
  await Tone.start()

  const synth = new Tone.Synth().toDestination()
  synth.triggerAttackRelease('C4', '8n')

  setPreviewReady(true)
  setPreviewPlaying(true)
}

  const stopPreviewPlayback = () => {
  setPreviewPlaying(false)
}
  
const [previewReady, setPreviewReady] = useState(false)
const [previewPlaying, setPreviewPlaying] = useState(false)
const [previewTempo, setPreviewTempo] = useState(92)
const [previewFeel, setPreviewFeel] = useState<PreviewFeel>('straight')
const [previewInstrument, setPreviewInstrument] = useState<PreviewInstrument>('guitar')
const [previewSection, setPreviewSection] = useState<PreviewSectionKey>('verse')
const [previewPattern, setPreviewPattern] = useState<PreviewPattern>('ballad_strum')
const [previewLoop, setPreviewLoop] = useState(true)
const [previewIncludeBass, setPreviewIncludeBass] = useState(true)
const [previewIncludeClick, setPreviewIncludeClick] = useState(false)
const [followPlayback, setFollowPlayback] = useState(true)
const [chords] = useState<ChordResponse | null>({
  key: 'G',
  capo: '0',
  verse: '| G | D | Em | C |',
  chorus: '| C | G | D | Em |',
  bridge: '| Em | C | G | D |',
  notes: '',
})
const previewBars = React.useMemo(() => {
  return buildPreviewBars(chords, previewSection)
}, [chords, previewSection])

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* ===============================
          SIDEBAR
      =============================== */}
      <div
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-56'
          } bg-gray-800 p-3 flex flex-col transition-all duration-300`}
        >
          {/* Hamburger */}
          <button
            onClick={() => setSidebarCollapsed((s) => !s)}
            className="mb-4 text-gray-300 hover:text-white"
            title="Toggle sidebar"
          >
            ☰
          </button>

          {/* Navigation */}
          <div className="flex flex-col gap-2">
            <SidebarItem
              icon="✍️"
              label="Write"
              active={mode === 'write'}
              collapsed={sidebarCollapsed}
              onClick={() => setMode('write')}
            />
            <SidebarItem
              icon="🎸"
              label="Chords"
              active={mode === 'chords'}
              collapsed={sidebarCollapsed}
              onClick={() => setMode('chords')}
            />
            <SidebarItem
              icon="📄"
              label="Sheet"
              active={mode === 'sheet'}
              collapsed={sidebarCollapsed}
              onClick={() => setMode('sheet')}
            />
            <SidebarItem
              icon="🎧"
              label="Rehearse"
              active={mode === 'rehearse'}
              collapsed={sidebarCollapsed}
              onClick={() => setMode('rehearse')}
            />
            <SidebarItem
              icon="🎤"
              label="Perform"
              active={mode === 'perform'}
              collapsed={sidebarCollapsed}
              onClick={() => setMode('perform')}
            />
            <SidebarItem
              icon="🎬"
              label="Video"
              active={mode === 'video'}
              collapsed={sidebarCollapsed}
              onClick={() => setMode('video')}
            />
          </div>
        </div>
      

      {/* ===============================
          MAIN CONTENT
      =============================== */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        
          <div className="h-12 bg-gray-800 flex items-center px-4 border-b border-gray-700">
            <span className="text-sm text-gray-400">
              Mode: {mode.toUpperCase()}
            </span>
          </div>
       

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* ===============================
              TEMP CONTENT (replace with your current UI)
          =============================== */}

          {mode === 'write' && (
            <div>
              <h1 className="text-xl mb-4">Write</h1>
              <p className="text-gray-400">
                Lyrics, ideas, and structure go here.
              </p>
            </div>
          )}

          {mode === 'chords' && (
            <div>
              <h1 className="text-xl mb-4">Chords</h1>
              <p className="text-gray-400">
                Generate and refine harmonic structure.
              </p>
            </div>
          )}

          {mode === 'sheet' && (
            <div>
              <h1 className="text-xl mb-4">Song Sheet</h1>
              <p className="text-gray-400">
                View and edit structured song sections.
              </p>
            </div>
          )}

            {mode === 'rehearse' && (
              <div className="h-full">
                <RehearsePanel
                  previewSection={previewSection}
                  setPreviewSection={setPreviewSection}
                  previewPattern={previewPattern}
                  setPreviewPattern={setPreviewPattern}
                  previewInstrument={previewInstrument}
                  setPreviewInstrument={setPreviewInstrument}
                  previewFeel={previewFeel}
                  setPreviewFeel={setPreviewFeel}
                  previewTempo={previewTempo}
                  setPreviewTempo={setPreviewTempo}
                  previewLoop={previewLoop}
                  setPreviewLoop={setPreviewLoop}
                  previewIncludeBass={previewIncludeBass}
                  setPreviewIncludeBass={setPreviewIncludeBass}
                  previewIncludeClick={previewIncludeClick}
                  setPreviewIncludeClick={setPreviewIncludeClick}
                  previewBarsLength={previewBars.length}
                  previewPlaying={previewPlaying}
                  previewReady={previewReady}
                  followPlayback={followPlayback}
                  setFollowPlayback={setFollowPlayback}
                  startPreviewPlayback={startPreviewPlayback}
                  stopPreviewPlayback={stopPreviewPlayback}
                />
              </div>
            )}

          {mode === 'perform' && (
            <div className="text-center text-2xl">
              🎤 Performance Mode — full screen lyrics
            </div>
          )}

          {mode === 'video' && (
            <div>
              <h1 className="text-xl mb-4">Video Generator</h1>
              <p className="text-gray-400">
                OpenArt / prompt generation tools go here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}