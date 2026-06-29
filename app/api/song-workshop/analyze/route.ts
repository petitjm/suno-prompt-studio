
import { buildSongWorkshopAnalysisPrompt, getDevelopmentFocusLabel } from '@/lib/songWorkshopPrompts'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const readJsonSafe = async (req: NextRequest) => {
  try {
    return await req.json()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await readJsonSafe(req)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const lyrics = String(body.lyrics || '').trim()
  const songTitle = String(body.songTitle || '').trim()
  const songVersionTitle = String(body.songVersionTitle || '').trim()
  const workshopNotes = String(body.workshopNotes || '').trim()
  const workshopControls = body.workshopControls || {}
  const developmentFocus = String(
      workshopControls.developmentFocus || 'connect-fragments',
    )
    const developmentFocusLabel = getDevelopmentFocusLabel(developmentFocus)
    const changeIntensity = Number(workshopControls.changeIntensity || 3)
    const preserveOriginal = Number(workshopControls.preserveOriginal || 4)
    const emotionalDirectness = Number(workshopControls.emotionalDirectness || 3)
    const singability = Number(workshopControls.singability || 4)

    const controlNotes = [
      `Development focus: ${developmentFocusLabel}`,
      `Change intensity: ${changeIntensity}/5`,
      `Preserve original phrases: ${preserveOriginal}/5`,
      `Emotional directness: ${emotionalDirectness}/5`,
      `Singability: ${singability}/5`,
    ]

  if (!lyrics) {
    return NextResponse.json(
      { error: 'Lyrics or song fragments are required.' },
      { status: 400 },
    )
  }


  const modelPrompt = buildSongWorkshopAnalysisPrompt({
      lyrics,
      songTitle,
      songVersionTitle,
      workshopNotes,
      workshopControls,
    })


  const analysis = {
      generatedAt: new Date().toISOString(),
    coreTheme:
      'The song is exploring how chance, fortune, fate, risk, and emotional survival can shape a life.',
    emotionalCentre:
      'The strongest emotional centre appears to be the human need to keep believing that the next turn, next choice, or next goodbye might still lead somewhere meaningful.',
    fragmentConnection:
      'The fragments can connect if each verse becomes a different form of chance: gambling, survival, separation, love, or fate. The chorus should carry the larger idea rather than staying only in casino imagery.',
    mainWeakness:
      'The verses currently feel disconnected because the chorus does not yet fully explain why these different scenes belong together.',
        controlNotes,
        modelPrompt,
    suggestedShape: [
      'Verse 1: literal chance — gambling, debt, the wheel, Lady Luck.',
      'Chorus: the repeated human impulse to try again.',
      'Verse 2: life-and-death chance — war, survival, fear, memory.',
      'Verse 3: emotional chance — departure, goodbye, separation, love.',
      'Bridge: reveal what the song is really about: fortune is not money, but survival, love, and the fragile chances we are given.',
      'Final chorus: evolve the meaning from winning to loving, surviving, or carrying on.',
    ],
    nextStep:
      'Create a cohesive draft that keeps the strongest original images but makes the chorus broad enough to connect all verses.',
    context: {
      songTitle,
      songVersionTitle,
      workshopNotes,
      workshopControls,
    },
  }

  return NextResponse.json({ analysis })
}