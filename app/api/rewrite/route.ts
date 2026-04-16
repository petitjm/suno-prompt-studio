import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const REWRITE_INSTRUCTIONS: Record<string, string> = {
  strengthen_chorus:
    'Rewrite the song to make the chorus hit harder emotionally and melodically, while keeping the song identity intact.',
  more_conversational:
    'Rewrite the song in a more natural, conversational, human way. Reduce stiffness and over-writing.',
  more_poetic:
    'Rewrite the song with more poetic imagery and lyric beauty, without becoming confusing or pretentious.',
  more_universal:
    'Rewrite the song so more listeners can project their own experience onto it.',
  more_personal:
    'Rewrite the song so it feels more intimate, personal, and emotionally direct.',
  simplify_lyrics:
    'Rewrite the song using simpler, clearer lyrics while preserving the emotional meaning.',
  improve_opening_line:
    'Rewrite the song with a stronger opening line and opening section that grabs attention earlier.',
  tighten_live:
    'Rewrite the song to be tighter and more effective for live acoustic performance, with clearer phrasing and stronger singable lines.',
}

async function getArtistDNAString() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) return ''

    const { data, error } = await supabase
      .from('artist_dna_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !data) return ''

    return `
Artist DNA Profile:
- Artist Name: ${data.artist_name || ''}
- Vocal Range: ${data.vocal_range || ''}
- Core Genres: ${data.core_genres || ''}
- Lyrical Style: ${data.lyrical_style || ''}
- Emotional Tone: ${data.emotional_tone || ''}
- Writing Strengths: ${data.writing_strengths || ''}
- Avoid List: ${data.avoid_list || ''}
- Visual Style: ${data.visual_style || ''}
- Performance Style: ${data.performance_style || ''}
- DNA Summary: ${data.dna_summary || ''}

Use this DNA as a strong stylistic guide. Do not mention it explicitly in the output.
`
  } catch (err) {
    console.error('Artist DNA lookup failed in rewrite route:', err)
    return ''
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const mode = String(body.mode || '')
    const instruction = REWRITE_INSTRUCTIONS[mode]

    if (!instruction) {
      return NextResponse.json({ error: 'Invalid rewrite mode' }, { status: 400 })
    }

    const currentLyrics = String(body.currentLyrics || '').trim()
    if (!currentLyrics) {
      return NextResponse.json({ error: 'Current lyrics are required' }, { status: 400 })
    }

    const artistDNA = await getArtistDNAString()

    const prompt = `
You are an expert songwriter and lyric editor.

Rewrite the song according to this instruction:
${instruction}

Song context:
Genre: ${body.genre || ''}
Moods: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}
Theme: ${body.theme || ''}
Hook: ${body.hook || ''}
Creative DNA preset: ${body.dnaId || ''}

${artistDNA}

Current lyrics:
${currentLyrics}

Return ONLY valid JSON with this exact shape:
{
  "lyrics_full": "",
  "lyrics_brief": "",
  "style_short": "",
  "style_detailed": ""
}

Requirements:
- Preserve the song's core meaning unless the instruction requires otherwise.
- Keep it coherent and performance-ready.
- Use the artist DNA where helpful to shape voice, phrasing, tone, and emotional emphasis.
- Do not include markdown fences.
- Do not include commentary outside JSON.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = completion.choices[0].message.content || '{}'

    let rewritten
    try {
      rewritten = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from model', raw: text },
        { status: 500 }
      )
    }

    if (body.project_id) {
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      await supabase.from('song_versions').insert({
        project_id: body.project_id,
        title: body.versionTitle || mode,
        form: {
          genre: body.genre || '',
          moods: Array.isArray(body.moods) ? body.moods : [],
          theme: body.theme || '',
          hook: body.hook || '',
          dnaId: body.dnaId || 'mpj-master',
        },
        result: rewritten,
      })

      if (user) {
        const { error: projectUpdateError } = await supabase
          .from('projects')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', body.project_id)
          .eq('user_id', user.id)

        if (projectUpdateError) {
          console.error('projects updated_at bump failed after rewrite save:', projectUpdateError)
        }
      }
    }

    return NextResponse.json(rewritten)
  } catch (err: any) {
    console.error('Rewrite route failure:', err)
    return NextResponse.json(
      { error: err?.message || 'Rewrite failed' },
      { status: 500 }
    )
  }
}