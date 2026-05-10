export type RewriteApiResponse = {
  rewrite?: string
  lyrics?: string
  text?: string
  lyrics_full?: string
  error?: string
}

export const readJsonSafe = async (res: Response) => {
  const text = await res.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

export const requestRewrite = async ({
  instruction,
  lyrics,
  sectionOnly,
}: {
  instruction: string
  lyrics: string
  sectionOnly: boolean
}) => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'rewrite',
      instruction,
      lyrics,
    }),
  })

  const data: RewriteApiResponse = await readJsonSafe(res)

  if (!res.ok) {
    throw new Error(data.error || 'Rewrite failed')
  }

  if (sectionOnly) {
    return data.rewrite || data.lyrics || data.text || ''
  }

  return data.lyrics_full || data.lyrics || data.rewrite || data.text || ''
}