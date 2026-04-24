// /components/SongSheet.tsx

'use client'

import React, { CSSProperties } from 'react'
import { PerformanceSection } from '@/types/song'
import SongSheet from '@/components/SongSheet'

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
              
  marginBottom: 40,
  padding: '16px 18px',
  borderRadius: 16,
  border: isActive ? '1px solid #60a5fa' : '1px solid transparent',
  background: isActive ? '#1e3a8a' : 'transparent',
  opacity: isActive ? 1 : 0.5,
  transform: isActive ? 'scale(1.02)' : 'scale(1)',
  transition: 'all 0.25s ease',
}}
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