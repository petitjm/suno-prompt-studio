export type DNAProfile = {
  id: string
  name: string
  vocal: string
  tone: string[]
  style_bias: string[]
  lyrics_rules: string[]
  hook_style: string
  structure_bias: string
  instrumentation_bias: string[]
  avoid: string[]
}

export const dnaProfiles: DNAProfile[] = [
  {
    id: 'mpj-master',
    name: 'MPJ Master',
    vocal: 'male low baritone, warm, slightly gritty, intimate but capable of lift',
    tone: ['melancholic', 'reflective', 'grounded', 'quietly hopeful'],
    style_bias: ['acoustic folk rock', 'modern country', 'cinematic ballad'],
    lyrics_rules: [
      'use conversational phrasing',
      'anchor emotion in real-world imagery',
      'keep lines singable live',
      'avoid abstract filler',
      'build naturally toward a strong chorus'
    ],
    hook_style: 'simple, repeatable, emotionally direct',
    structure_bias: 'Verse 1, Chorus, Verse 2, Chorus, Bridge, Final Chorus',
    instrumentation_bias: [
      'acoustic guitar',
      'light ambient textures',
      'subtle pedal steel',
      'minimal supportive percussion'
    ],
    avoid: ['generic clichés', 'forced rhymes', 'overly abstract language']
  },
  {
    id: 'commercial-hit',
    name: 'Commercial Hit',
    vocal: 'clean, confident, radio-ready',
    tone: ['clear', 'direct', 'immediate'],
    style_bias: ['mainstream pop', 'modern country'],
    lyrics_rules: [
      'use short lines',
      'make the hook land early',
      'use clear emotional language'
    ],
    hook_style: 'instant, memorable, repeatable',
    structure_bias: 'Verse, Pre-Chorus, Chorus, Verse, Pre-Chorus, Chorus, Bridge, Final Chorus',
    instrumentation_bias: ['modern polished production', 'big chorus lift'],
    avoid: ['slow buildup', 'complex phrasing']
  },
  {
    id: 'raw-folk',
    name: 'Raw Folk',
    vocal: 'intimate, slightly rough',
    tone: ['honest', 'bare', 'unpolished'],
    style_bias: ['folk', 'acoustic'],
    lyrics_rules: [
      'use simple language',
      'focus on lived-in detail',
      'keep it emotionally honest'
    ],
    hook_style: 'subtle but moving',
    structure_bias: 'Loose story-led structure with a simple recurring chorus',
    instrumentation_bias: ['acoustic guitar only'],
    avoid: ['overproduction', 'big glossy phrasing']
  }
]