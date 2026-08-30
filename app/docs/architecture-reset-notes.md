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
Performance
        ↓
Musical guide
        ↓
Rehearse / Perform
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

### Lyric story and delivery

Musical intent must not be derived from structural section labels alone.

Labels such as Verse, Chorus, Bridge, and Final Chorus describe structural function, but they do not define emotional meaning or delivery. A chorus may be uplifting, restrained, reflective, pleading, resigned, angry, intimate, or deliberately understated. A final chorus does not inherently need to become bigger, higher, faster, or more energetic.

The lyric story and intended emotional delivery should therefore sit above section-based musical defaults.

The developing hierarchy should be:

1. lyric story and emotional intent;
2. song-level musical character;
3. optional section-specific intent or delivery overrides;
4. phrase-level shaping;
5. individual melody-note decisions.

Song-level controls should establish a useful starting character, not impose a blanket solution on every section.

Section-specific intent should allow materially different treatment where the song requires it. For example, a Final Chorus could be more deliberate, spacious, emotionally weighted, restrained, or lower in movement without teaching the system that all Final Choruses should behave that way.

Delivery should also be treated as distinct from tempo. A more deliberate emotional delivery may involve longer important words, greater phrase space, fewer melodic changes, or more breathing room while the underlying song tempo remains unchanged. Explicit tempo changes may be supported separately where they are genuinely part of the composition.

The long-term goal is for musical decisions to respond to what the lyric is saying and how the songwriter intends it to be delivered, rather than relying mainly on generic assumptions about section type.

This principle should eventually inform both the generated musical guide and Suno prompting so that both systems interpret the same underlying song-specific and section-specific intent.

## Shared song knowledge / Song Creative Profile

The application should remember useful creative knowledge that has already been established about a saved song version rather than asking each downstream workspace to rediscover or re-enter it.

A small **Song Creative Profile** is therefore stored with the saved song version.

The initial profile contains:

- genre;
- moods;
- core theme;
- emotional centre.

This profile is deliberately small. It is not intended to become a large metadata form or a substitute for the song itself.

The distinction between working analysis and durable song knowledge is important:

- detailed Develop analysis is temporary working-session material;
- selected or accepted song knowledge may be promoted into the Song Creative Profile;
- the profile persists with the saved song version;
- downstream workspaces may use the profile as useful starting context;
- downstream overrides do not automatically rewrite the saved profile.

For example, Develop may analyse a song and identify its theme and emotional centre. The songwriter may explicitly choose **Use in song profile** to preserve those conclusions. Video may then inherit genre, moods, and theme without asking for the same information again.

A saved song version should therefore increasingly act as a stable creative checkpoint containing both the lyric and a small amount of accepted song understanding.

Do not make one feature-specific prompt or UI field the source of truth for shared creative knowledge. In particular, Suno Style text and OpenArt prompt text are downstream representations, not the canonical song identity.

Artist-level identity and song-level identity should remain distinct:

- Artist DNA describes persistent artist characteristics such as vocal identity, broad genre tendencies, performance identity, and visual identity.
- Song Creative Profile describes the particular saved song version: its genre, moods, theme, and emotional centre.

Where useful, downstream systems may combine both.

## Task-driven workspace UI

The application should behave as a songwriter's workbench rather than as a collection of implementation panels.

### Video task workflow

Video is organised as:

1. Set direction
2. Generate
3. Review
4. Save version
5. Make video

Set direction should reuse existing song knowledge where appropriate. Genre, moods, and theme may be seeded from the saved Song Creative Profile. Genuinely visual decisions such as visual focus and treatment remain Video-specific and editable.

Inherited values are starting points, not locked values. Editing them in Video does not automatically modify the saved Song Creative Profile.

## External-tool handoff architecture

Suno, OpenArt, and similar external creative tools evolve independently of this application.

Suno Prompt Studio should therefore not attempt to permanently mirror the current UI, field names, or workflow of any external provider.

The durable architecture is:

```text
Song
  ↓
shared musical / production intent
  ↓
Suno-oriented handoff / future provider / plain production brief

Song
  ↓
shared visual intent
  ↓
OpenArt-oriented handoff / future provider / plain visual brief

### Iterative songwriting loop

Song development is iterative rather than strictly linear.

Harmony, lyric phrasing, chord placement, melody, and structure may need repeated revision before the song reaches a satisfactory save point.

For the Chords workflow, Tasks 2–5 should be understood as a development loop:

1. Add chords
2. Shape the harmony
3. Fit chords and lyrics
4. Refine lyrics, phrasing, harmony, or placement as needed
5. Save a version when the current musical state is worth preserving

Changes in one area may require revisiting another. For example:

- lyric changes may alter phrasing, section length, harmonic rhythm, or chord placement;
- harmony changes may expose weak or awkward lyric phrasing;
- melody may later require both lyric and chord-placement changes;
- chord placement may reveal that the current progression does not support the vocal phrase naturally.

The UI should make it easy to move backward and forward within this loop without losing the active song-development context.

A saved version is a stable checkpoint in an evolving song, not merely the output of one isolated tool.

"Fit chords and lyrics" should be treated as a genuine songwriting task, not only as technical validation. It may provide routes to:

- adjust chord placement;
- refine lyrics or phrasing;
- return to Shape the harmony;
- review the combined lyric/chord result;
- save once the result is satisfactory.

### Navigation hierarchy

Use a two-level workspace structure:

1. Primary sidebar — major application areas such as Projects, Write, Develop, Chords, Rehearse, Perform, and Video.
2. Secondary task sidebar — the tasks required within the selected application area.
3. Main workspace — only the controls and information needed for the currently selected task.

When a primary category is selected, the primary sidebar may collapse to icons so that more of the window is available for the task workspace. Repeated selection of the active primary category toggles the primary sidebar between collapsed and expanded states.

The UI should make three things immediately clear:

1. Where am I in the application?
2. What task am I working on?
3. What, if anything, needs attention next?

### Task navigation rules

The secondary task sidebar is the normal way to move between tasks.

The main workspace is for doing the work, not duplicating navigation.

Do not add generic Continue or Next buttons merely to move to the next task. Use a Continue-style action only when completing the current task genuinely unlocks, creates, or hands off something required by the next stage.

Task availability and status should be derived from real application state rather than from whether a navigation button has been clicked.

Tasks should remain visible even when unavailable, with a useful Waiting, Ready, In progress, Complete, or review-type status where appropriate.

### Choice and action hierarchy

Equivalent user choices must be presented consistently:

- equal placement;
- equal visual weight;
- equal button styling;
- no accidental implication that one option is preferred.

For example, on Chords > Create or bring in chords, generating new chords and reading chords already present in the song are equally valid starting points and should be shown side-by-side with equal prominence.

Strong primary button styling should be used when an action is genuinely important or recommended. Do not use colour differences to imply a recommendation that the product does not actually intend.

Consistency of interaction and visual meaning should be maintained across all modules.

### Songwriter-facing language

UI labels should describe the musical or songwriting job rather than the implementation.

Prefer language such as:

- Develop the song
- Generate chords
- Shape the harmony
- Check chords with the lyrics
- Use this version

Avoid implementation-oriented labels such as:

- cohesive draft
- basic draft
- full draft
- workshop controls

Internal function and data names do not need to be renamed merely to improve the user-facing language.

### Plain-language musical direction

Prefer ordinary musician and songwriter language before technical theory language.

Users may naturally describe what they want with phrases such as:

- more emotional
- a little dreamy
- softer
- more upbeat
- rockier
- poppy
- funkier
- like folk, but not too folky
- bigger chorus
- stripped-back
- more intimate

The UI should support this vocabulary directly rather than requiring the user to translate their intention into music-theory terminology.

Musically technical concepts may still be supported, but should normally sit behind Advanced controls or be inferred internally.

The product should translate plain-language musical intention into appropriate harmonic, melodic, arrangement, production, and performance decisions.

When users find it difficult to articulate what they want, provide useful selectable descriptors as prompts. Free-text direction should remain available for users who prefer to describe the desired result in their own words.

### Progressive disclosure

Normal songwriting work should not be surrounded by technical or diagnostic information.

Keep useful engineering, JSON, copy/export, model, renderer, validation, and diagnostic controls available where needed, but place them under Advanced or another progressive-disclosure mechanism unless they are directly required for the current songwriting task.

A task should ideally fit comfortably within the available workspace without requiring the user to understand unrelated downstream machinery.

### Module responsibility

Do not preserve historical UI placement merely because functionality was originally developed in one module.

Each module should visually own the job implied by its purpose.

For example:

- Chords owns creating, developing, reviewing, placing, and saving harmony.
- Make Song owns guide-track planning, musical-guide rendering, audio readiness, renderer preparation, and related audio workflow.
- Technical renderer/debugging information should not compete visually with harmonic songwriting controls.

Existing functionality may remain technically located in its current implementation while the UI is progressively reorganised, but the long-term module boundaries should follow the user workflow.

### Chord-generation direction

Do not expose the current `generateBasicChords` and `generateChords` implementations as two unexplained competing normal workflows.

Current direction:

1. The normal chord-generation action should create a musically strong, song-specific harmonic proposal.
2. The proposal should consider lyrics, artist/performance character, vocal suitability, harmonic richness, and section development.
3. Shape the harmony should then provide genuine songwriter-controlled development rather than relying primarily on transpose or raw JSON editing.
4. Chord placement against lyrics should happen after the harmony can be reviewed and shaped.
5. Guide-track and audio-generation decisions belong downstream in Make Song.

For the current implementation, the richer `generateChords` route is the normal Generate chords action because it contains more song-specific musical reasoning. `generateBasicChords` remains available as an Advanced simple/quick chord sketch while the chord architecture is developed.

Long term, prefer one strong chord-generation path followed by meaningful songwriter-controlled harmonic development over maintaining two competing generators.