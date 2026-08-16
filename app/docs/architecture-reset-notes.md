# Suno Prompt Studio — Living Project Context

> **Status:** Living document  
> **Repository:** `suno-prompt-studio`  
> **Branch:** `architecture-reset`
>
> This document is the primary continuity and architecture reference for the project.
>
> It must be reviewed before making significant workflow, architecture, songwriting,
> versioning, chord, audio, Suno, or Video changes.
>
> Update this document whenever a development change materially alters the product
> workflow, architecture, protected behaviour, or current development direction.

---

# READ THIS FIRST IN EVERY NEW DEVELOPMENT CHAT

Suno Prompt Studio is intended to become a **cohesive songwriter's workbench**.

The highest priority is **song creation itself**:

- lyrics
- melody
- chords
- song structure
- arrangement
- performance development

Suno, OpenArt, AI prompting, release tools, and video tools are supporting systems.
They must help create better songs rather than become the centre of the application.

A large amount of working functionality already exists.

**Do not assume a missing workflow simply because it is not immediately visible.**

Before changing an established area:

1. Inspect the existing code and current behaviour.
2. Identify what already works.
3. Identify saved/versioned data involved.
4. Preserve established creative workflows unless there is a specific reason to change them.
5. Avoid solving a local symptom without checking its effect on the wider songwriting workflow.

The current development challenge is primarily **cohesion and discoverability**, not wholesale rebuilding.

The building blocks of the songwriter's workbench are largely present.

---

# 1. Product purpose

The application exists to help a singer-songwriter move from an idea or incomplete
composition toward a credible, performable song.

The desired long-term workflow is approximately:

```text
Ideas / incomplete song
        ↓
Write
        ↓
Rewrite / develop / compare
        ↓
Approved saved song version
        ↓
Existing or newly developed chords
        ↓
Make Song
        ↓
Performance Sheet
        ↓
Musical guide / WAV
        ↓
Sheet / Rehearse / Perform
        ↓
Suno / Video / Release support where useful
```

## Make Song and musical guide purpose

Make Song is intended to support song development and rehearsal, not to produce a polished performance backing track.

The generated musical guide should therefore be:

- pleasant and musically credible enough for repeated listening;
- clear enough to support singing, playing, rehearsal, and evaluation;
- accurate enough to expose problems in phrasing, chord placement, structure, and melody;
- restrained enough that accompaniment choices do not distract from the song itself.

Production polish is secondary to musical usefulness.

The next major musical capability is melody. Melody, phrasing, and chord placement should progressively become explicit, editable, version-aware musical decisions rather than being treated only as rendered audio.

As a song develops:

- compatible chord, phrasing, and melody decisions should be preserved where the lyric and section still correspond;
- changed or newly introduced material should be identified explicitly;
- only affected musical material should need revision where possible;
- creating a new song version should not blindly discard established musical work.

The long-term target is a structured relationship between lyric phrases, phrase timing, chord events, and melody notes so that changes made during songwriting can be embodied reliably in subsequent song versions and musical guides.
### Song-specific musical intent

The current musical-guide work has shown that fixed section rules are useful as development defaults, but they must not become the final artistic model.

Rules such as "chorus = higher, brighter, more active" or "bridge = contrasting" can help establish musical differentiation, but different songs may require very different behaviour. A chorus may need to feel broader rather than more upbeat; a final chorus may need to become more restrained, heavier, lower, sparser, or more intense rather than simply larger.

Musical behaviour should therefore become driven by song-specific intent rather than by section labels alone.

The first configurable musical-intent layer should be deliberately small. The initial Melody Character model should concentrate on:

- register;
- melodic lift;
- melodic movement.

These should initially operate as song-level settings. Section-specific overrides can be introduced later where they provide meaningful songwriting control.

Existing section-aware rules should remain useful as defaults or interpretations of those settings, rather than being treated as permanent artistic decisions.

The same musical-intent model should eventually inform more than the generated musical guide. In particular, the Suno prompt system should later be revisited so that vocal, melodic, arrangement, energy, and section-transition guidance can be derived from the same song-specific intent rather than independently regenerated from generic section assumptions.

The existing Suno prompt functionality should remain stable while this musical-intent layer is developed and proved through Make Song. Once the intent model is established, the Suno workflow should be reviewed to determine which existing prompt fields should consume shared musical intent automatically and which controls remain genuinely Suno-specific.