// /components/SongSheet.tsx

'use client'

import React, { CSSProperties } from 'react'
import { PerformanceSection } from '@/types/song'

type Props = {
  performanceSheet: string
  performanceSections: PerformanceSection[]
  performanceFontSize: number
  activePerformanceSectionId: string | null
  performanceSectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
}

export default function SongSheet({
  performanceSheet,
  performanceSections,
  performanceFontSize,
  activePerformanceSectionId,
  performanceSectionRefs,
}: Props) {
  const performanceSheetStyle: CSSProperties = {
    background: '#0f0f12',
    padding: 20,
    borderRadius: 16,
    border: '1px solid #3f3f46',
    minHeight: 360,
  }

  if (!performanceSheet.trim()) {
    return (
      <div style={{ color: '#a1a1aa', padding: 20 }}>
        Create a song sheet first to use Performance Mode.
      </div>
    )
  }

  return (
    <div
      style={{
        ...performanceSheetStyle,
        fontSize: performanceFontSize,
      }}
    >
      {performanceSections.map((section) => {
        const isActive = section.id === activePerformanceSectionId

        return (
          <div
            key={section.id}
            ref={(el) => {
              performanceSectionRefs.current[section.id] = el
            }}
            style={{
              marginBottom: 28,
              padding: '10px 12px',
              borderRadius: 12,
              border: isActive ? '1px solid #60a5fa' : '1px solid transparent',
              background: isActive ? '#172554' : 'transparent',
              boxShadow: isActive
                ? '0 0 0 1px rgba(96,165,250,0.25) inset'
                : 'none',
              transition:
                'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontFamily: 'Courier New, monospace',
                fontSize: performanceFontSize,
                lineHeight: 1.8,
                background: 'transparent',
                color: 'white',
              }}
            >
              {section.content}
            </pre>
          </div>
        )
      })}
    </div>
  )
}