import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { dnaProfiles } from '@/lib/dnaProfiles'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function stripCodeFences(text: string) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

async function generateForDNA({
  openai,
  body,
  dna,
  lyricsOnly,
}: {
  openai: OpenAI
  body: any
  dna: any
  lyricsOnly: boolean
}) {
  const prompt = `
You are a songwriting assistant that creates Suno-ready outputs.

USER INPUT:
Genre: ${body.genre || ''}
Mood: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}
Theme: ${body.theme || ''}
Hook: ${body.hook || ''}
Language Style: ${body.languageStyle || 'Balanced'}
Perspective: ${body.perspective || 'Balanced'}
Song Focus: ${body.songFocus || 'Balanced'}
Live-Friendly Phrasing: ${body.liveFriendly ? 'On' : 'Off'}

CREATIVE DNA:
Name: ${dna.name}
Vocal: ${dna.vocal}
Tone: ${dna.tone.join(', ')}
Style Bias: ${dna.style_bias.join(', ')}
Lyrics Rules: ${dna.lyrics_rules.join(', ')}
Hook Style: ${dna.hook_style}
Structure Bias: ${dna.structure_bias}
Instrumentation Bias: ${dna.instrumentation_bias.join(', ')}
Avoid: ${dna.avoid.join(', ')}

MODE:
${lyricsOnly ? 'Rewrite lyrics only. Keep the same overall concept, but generate fresh lyrics and a fresh lyric brief.' : 'Generate full output.'}

Return valid JSON only with exactly these keys:
{
  "style_short": "string",
  "style_detailed": "string",
  "lyrics_brief": "string",
  "lyrics_full": "string"
}

Rules:
- style_short should be concise and Suno-friendly
- style_detailed should be richer but still practical
- lyrics_brief should summarise the song direction in 1 to 3 sentences
- lyrics_full should be complete lyrics, not an outline
- lyrics_full MUST use real line breaks (\\n) between every line
- each lyric line must be on its own line
- format lyrics_full like this exactly:

[Verse 1]
Line one
Line two

[Chorus]
Line one
Line two

[Verse 2]
Line one
Line two

[Bridge]
Line one
Line two

[Final Chorus]
Line one
Line two

- include section headers like [Verse 1], [Chorus], [Verse 2], [Bridge], [Final Chorus]
- keep lines short, natural, and singable
- include the hook naturally in the chorus
- avoid markdown code fences

Lyric direction controls:
- language style should follow the selected setting:
  - Conversational = plainspoken, natural, direct
  - Balanced = clear and expressive without over-stylising
  - Poetic = more lyrical and image-rich, but still singable

- perspective should follow the selected setting:
  - Personal = intimate, specific, emotionally close
  - Balanced = mix of personal detail and broader relatability
  - Universal = easier for listeners to project themselves into

- song focus should follow the selected setting:
  - Story = more narrative development in verses
  - Balanced = equal attention to verses and chorus
  - Hook-driven = stronger repetition and chorus emphasis

- if live-friendly phrasing is On:
  - keep lines easier to sing live
  - prefer clear diction and memorable phrasing
  - avoid overly dense or awkward wording

${lyricsOnly ? `
Extra rules for lyrics-only mode:
- keep style_short and style_detailed aligned with the same concept
- do not radically change the concept, only refresh the lyrics
- make the new lyrics noticeably different from the previous version in phrasing and detail
` : ''}
`

  const response = await openai.responses.create({
    model: 'gpt-4o-mini',
    input: prompt,
  })

  const content = response.output_text || ''
  const cleaned = stripCodeFences(content)
  const parsed = JSON.parse(cleaned)

  return {
    dna_id: dna.id,
    dna_name: dna.name,
    ...parsed,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lyricsOnly = Boolean(body.lyricsOnly)
    const multiVersion = Boolean(body.multiVersion)

    if (multiVersion) {
      const selectedDNAs = dnaProfiles.filter((profile) =>
        ['mpj-master', 'commercial-hit', 'raw-folk'].includes(profile.id)
      )

      const versions = await Promise.all(
        selectedDNAs.map((dna) =>
          generateForDNA({
            openai,
            body,
            dna,
            lyricsOnly,
          })
        )
      )

      return NextResponse.json({ versions })
    }

    const dna =
      dnaProfiles.find((profile) => profile.id === body.dnaId) || dnaProfiles[0]

    const single = await generateForDNA({
      openai,
      body,
      dna,
      lyricsOnly,
    })

    return NextResponse.json(single)
  } catch (error: any) {
    console.error('Generate route error:', error)

    return NextResponse.json(
      { error: error?.message || 'Failed to generate output' },
      { status: 500 }
    )
  }
}