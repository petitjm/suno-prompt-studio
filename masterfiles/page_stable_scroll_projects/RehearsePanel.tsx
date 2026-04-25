'use client'

import React from 'react'
import type { PreviewFeel, PreviewInstrument, PreviewPattern, PreviewSectionKey } from '@/types/song'

type RehearsePanelProps = {
  previewSection: PreviewSectionKey
  setPreviewSection: (value: PreviewSectionKey) => void
  previewPattern: PreviewPattern
  setPreviewPattern: (value: PreviewPattern) => void
  previewInstrument: PreviewInstrument
  setPreviewInstrument: (value: PreviewInstrument) => void
  previewFeel: PreviewFeel
  setPreviewFeel: (value: PreviewFeel) => void
  previewTempo: number
  setPreviewTempo: (value: number) => void
  previewLoop: boolean
  setPreviewLoop: (value: boolean) => void
  previewIncludeBass: boolean
  setPreviewIncludeBass: (value: boolean) => void
  previewIncludeClick: boolean
  setPreviewIncludeClick: (value: boolean) => void
  previewBarsLength: number
  previewPlaying: boolean
  previewReady: boolean
  followPlayback: boolean
  setFollowPlayback: (value: boolean) => void
  startPreviewPlayback: () => void
  stopPreviewPlayback: () => void
}

export default function RehearsePanel({
  previewSection,
  setPreviewSection,
  previewPattern,
  setPreviewPattern,
  previewInstrument,
  setPreviewInstrument,
  previewFeel,
  setPreviewFeel,
  previewTempo,
  setPreviewTempo,
  previewLoop,
  setPreviewLoop,
  previewIncludeBass,
  setPreviewIncludeBass,
  previewIncludeClick,
  setPreviewIncludeClick,
  previewBarsLength,
  previewPlaying,
  previewReady,
  followPlayback,
  setFollowPlayback,
  startPreviewPlayback,
  stopPreviewPlayback,
}: RehearsePanelProps) {
    const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: 10,
  border: '1px solid #444',
  background: '#3f3f46',
  color: 'white',
  boxSizing: 'border-box',
}
const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #52525b',
  background: '#3f3f46',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
}

  return (
    <div
      style={{
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        border: '1px solid #3f3f46',
        background: '#1b1b20',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 14 }}>Audio Preview</h3>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
              <label style={{ cursor: 'pointer' }}>
                Section
                <select
                  value={previewSection}
                  onChange={(e) => setPreviewSection(e.target.value as PreviewSectionKey)}
                  style={{ ...inputStyle, width: 170, marginLeft: 10, padding: '10px 12px' }}
                >
                  <option value="verse">Verse</option>
                  <option value="chorus">Chorus</option>
                  <option value="bridge">Bridge</option>
                  <option value="full_song">Full Song</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Pattern
                <select
                  value={previewPattern}
                  onChange={(e) => setPreviewPattern(e.target.value as PreviewPattern)}
                  style={{ ...inputStyle, width: 210, marginLeft: 10, padding: '10px 12px' }}
                >
                  <option value="ballad_strum">Ballad Strum</option>
                  <option value="country_train">Country Train</option>
                  <option value="fingerpick">Fingerpick</option>
                  <option value="piano_block">Piano Block Chords</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Instrument
                <select
                  value={previewInstrument}
                  onChange={(e) => setPreviewInstrument(e.target.value as PreviewInstrument)}
                  style={{ ...inputStyle, width: 170, marginLeft: 10, padding: '10px 12px' }}
                  disabled={previewPattern === 'piano_block' || previewPattern === 'fingerpick'}
                >
                  <option value="guitar">Guitar</option>
                  <option value="piano">Piano</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Feel
                <select
                  value={previewFeel}
                  onChange={(e) => setPreviewFeel(e.target.value as PreviewFeel)}
                  style={{ ...inputStyle, width: 150, marginLeft: 10, padding: '10px 12px' }}
                  disabled={previewPattern === 'fingerpick' || previewPattern === 'piano_block'}
                >
                  <option value="straight">Straight</option>
                  <option value="swing">Swing</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <label style={{ cursor: 'pointer' }}>
                Tempo
                <input
                  type="range"
                  min={60}
                  max={150}
                  value={previewTempo}
                  onChange={(e) => setPreviewTempo(Number(e.target.value))}
                  style={{ marginLeft: 10 }}
                />
                <span style={{ marginLeft: 8 }}>{previewTempo} BPM</span>
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewLoop}
                  onChange={(e) => setPreviewLoop(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Loop
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewIncludeBass}
                  onChange={(e) => setPreviewIncludeBass(e.target.checked)}
                  style={{ marginRight: 8 }}
                  disabled={previewPattern === 'country_train'}
                />
                Add bass
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewIncludeClick}
                  onChange={(e) => setPreviewIncludeClick(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Add click
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                onClick={startPreviewPlayback}
                disabled={!previewBarsLength}
                style={{
                  ...primaryButtonStyle,
                  opacity: previewBarsLength ? 1 : 0.55,
                  cursor: previewBarsLength ? 'pointer' : 'not-allowed',
                }}
              >
                {previewPlaying ? 'Restart Preview' : previewReady ? 'Play Preview' : 'Enable Audio + Play'}
              </button>

              <button
                onClick={stopPreviewPlayback}
                disabled={!previewPlaying}
                style={{
                  ...secondaryButtonStyle,
                  opacity: previewPlaying ? 1 : 0.55,
                  cursor: previewPlaying ? 'pointer' : 'not-allowed',
                }}
              >
                Stop Preview
              </button>
            </div>

            <div style={{ color: '#a1a1aa', fontSize: 13 }}>
              {previewBarsLength > 0
                ? `${previewBarsLength} preview bar${previewBarsLength === 1 ? '' : 's'} ready`
                : 'Generate or load chords to enable preview'}
            </div>

    </div>
  )
}