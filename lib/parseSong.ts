export type SongSection = {
  id: string
  title: string
  type:
    | 'verse'
    | 'pre_chorus'
    | 'chorus'
    | 'bridge'
    | 'breakdown'
    | 'outro'
    | 'other'
  content: string[]
}

const normalise = (str: string) =>
  str.toLowerCase().replace(/[^a-z]/g, '')

const detectType = (title: string): SongSection['type'] => {
  const t = normalise(title)

  if (t.includes('prechorus')) return 'pre_chorus'
  if (t.includes('chorus')) return 'chorus'
  if (t.includes('verse')) return 'verse'
  if (t.includes('bridge')) return 'bridge'
  if (t.includes('breakdown')) return 'breakdown'
  if (t.includes('outro')) return 'outro'

  return 'other'
}

  export function normalizeRoot(note: string): string {
  return note
    .trim()
    .toUpperCase()
    .replace('♯', '#')
    .replace('♭', 'B')
}

export function displayRoot(note: string): string {
  return note
}

export function parseSongSheet(text: string): SongSection[] {
  const lines = text.split('\n')

  const sections: SongSection[] = []
  let current: SongSection | null = null
  let index = 0

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) continue

    // Detect headings like "Verse 1:", "Chorus:", etc.
    if (/^[A-Za-z].*:\s*$/.test(line)) {
      const title = line.replace(':', '').trim()

      current = {
        id: `section-${index++}`,
        title,
        type: detectType(title),
        content: [],
      }

      sections.push(current)
    } else if (current) {
      current.content.push(rawLine)
    }
  }

  return sections


}