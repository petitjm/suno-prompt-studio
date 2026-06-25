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

  if (!lyrics) {
    return NextResponse.json(
      { error: 'Lyrics or song fragments are required.' },
      { status: 400 },
    )
  }

  const draft = {
    title: songTitle || 'Spin the Wheel Again',
    versionTitle: songVersionTitle || 'Cohesive workshop draft',
    workshopNotes,
    workshopControls,
    lyric: `{title: Spin the Wheel Again}
{artist: Michael Petitjean}

[Verse 1]
The wheel of fortune turned and turned
Lady Luck just watched me burn
Deeper in debt with every spin
Still I hungered for that big, big win

Sense and reason slipped away
One more throw, one more play
Every loss said, "Walk away"
But chance kept calling out my name

[Chorus]
Take my bet, spin the wheel again
Round and round, through loss and pain
I know the odds are wearing thin
But I'm bound to win in the end

Spin the wheel again and again
I'm bound to win in the end

[Verse 2]
Then the wheel was mud and steel
Not a table, but a battlefield
As I rose from the safety of our trench
The cries of falling men began

Though death was walking close to me
Somehow your face was all I'd see
Not here beside me, yet still near
You held my heart and calmed my fear

[Chorus]
Take my bet, spin the wheel again
Round and round, through loss and pain
I know the odds are wearing thin
But I'm bound to win in the end

Spin the wheel again and again
I'm bound to win in the end

[Verse 3]
"All aboard," that untimely cry
The final moment to say goodbye
So much to say, but nothing said
Only numbness filled my head

Your tightening grip, you wouldn't let go
The whistle cried, the night moved slow
A last embrace, a final kiss
Another life left up to chance

[Bridge]
Maybe fortune has no heart
Maybe luck don't know our names
Maybe all we ever do
Is love while standing in the flames

[Final Chorus]
Take my hand, spin the wheel again
Round and round, through love and pain
I know the odds are wearing thin
But I'm bound to love in the end

Spin the wheel again and again
I'm bound to love in the end`,
    whatWasKept: [
      'The wheel of fortune image.',
      'Lady Luck.',
      'The hunger for a big win.',
      'The trench scene.',
      'The train goodbye scene.',
      'The repeated “again and again” feeling.',
    ],
    whatChanged: [
      'The gambling image became the opening metaphor rather than the whole song.',
      'The disconnected verses were shaped into three forms of chance: gambling, war, and goodbye.',
      'The final chorus changes from winning to loving, giving the song an emotional destination.',
    ],
    nextStep:
      'Decide whether the final chorus should stay hopeful and intimate, or return to the darker “bound to win” refrain for a more tragic ending.',
  }

  return NextResponse.json({ draft })
}