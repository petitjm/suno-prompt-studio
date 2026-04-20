// /components/SectionJumpButtons.tsx

'use client'

import React, { CSSProperties } from 'react'
import { PerformanceSection } from '@/types/song'

type Props = {
  performanceSections: PerformanceSection[]
  activePerformanceSectionId: string | null
  onJumpToSection: (sectionId: string) => void
}

export default function SectionJumpButtons({
  performanceSections,
  activePerformanceSectionId,
  onJumpToSection,
}: Props) {
  const secondaryButtonStyle: CSSProperties = {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #52525b',
    background: '#3f3f46',
    color: 'white',
    cursor: 'pointer',
  }

  if (performanceSections.length === 0) {
    return null
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {performanceSections.map((section) => {
        const isActive = section.id === activePerformanceSectionId

        return (
          <button
            key={section.id}
            onClick={() => onJumpToSection(section.id)}
            style={{
              ...secondaryButtonStyle,
              borderColor: isActive ? '#60a5fa' : '#52525b',
              background: isActive ? '#1d4ed8' : '#3f3f46',
              boxShadow: isActive ? '0 0 0 1px #93c5fd inset' : 'none',
            }}
          >
            {section.label}
          </button>
        )
      })}
    </div>
  )
}