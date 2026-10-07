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

The current development challenge is primarily **cohesion, discoverability, and musical fidelity**, not wholesale rebuilding.

The building blocks of the songwriter's workbench are largely present. Current development is establishing a broader songwriter musical model in which human-performance analysis is one evidence source for understanding song identity, Artist DNA, and rendition-specific performance. A recording can be highly informative, but it must not become a prerequisite for creating or developing a song, nor should one recorded rendition be mistaken for the permanent identity of the composition.

---

# 1. Product purpose

The application exists to help a singer-songwriter move from an idea or incomplete
composition toward a credible, performable song.

The desired long-term workflow is approximately:

```text
Ideas / incomplete song
        ↓
Write / develop / compare
        ↓
Build / refine durable musical knowledge
        │
        ├─ Song Identity Model
        │    what should remain recognisably this song
        │
        ├─ Artist DNA Model
        │    how this artist characteristically expresses musical ideas
        │
        └─ Optional performance evidence
             recording / vocal stem / played fragment / rehearsal take
             analysed without treating one rendition as permanent truth
        ↓
Choose rendition intent
        genre / emotion / arrangement / instrumentation /
        tempo / metre / performance direction
        ↓
Songwriter-guided and/or AI-assisted interpretation
        ↓
Performance / Rendition Model
        ↓
Saved song version
+ chord checkpoint
+ accepted musical intent
        ↓
Make Song
        ↓
Musical guide / rehearsal support
        ↓
Suno / Video / Release support
where useful
```

## Songwriter-guided and AI-assisted musical development

Suno Prompt Studio must support two complementary approaches to musical development. Neither route should be treated as universally superior; the appropriate route depends on what creative material already exists and what the songwriter is trying to change.

### Songwriter-guided

The songwriter's own musical idea or performance is the creative authority.

This route is appropriate when the songwriter already has some or all of:

- a sung melody;
- vocal phrasing;
- rhythmic delivery;
- expressive timing;
- dynamic shape;
- slides, scoops, rough intonation, strain, breath, pauses, or other human performance characteristics.

The system should analyse, expose, preserve, and make those decisions developable without unnecessarily replacing them with generic generated alternatives.

The goal is not transcription for its own sake. The goal is to preserve the musical and emotional identity already present in the songwriter's performance while allowing the song to be developed.

### AI-assisted

AI may originate or reinterpret melody, phrasing, harmony, arrangement, or performance direction from structured song knowledge.

This route is useful when:

- the song does not yet have an established melody;
- the songwriter deliberately wants alternative musical ideas;
- a genre or arrangement reinterpretation is being explored;
- the existing musical identity is intended to change materially.

AI assistance must not automatically imply polishing, smoothing, conventionalising, or replacing a songwriter's established musical identity.

The two routes may be combined. For example, the songwriter's melodic and expressive identity may be preserved while AI explores a different arrangement, harmonic treatment, instrumentation, genre, or alternative section.

## Evolving song structure and creative authority

The application must model **evolving musical decisions**, not manufacture certainty from incomplete evidence.

A song is not merely the sum of measurable properties extracted from one performance, nor should it be generated mechanically from a fixed collection of rules. Lyrics, phrase structure, melody, harmony, rhythm, and performance influence one another throughout development.

The working relationship is therefore iterative:

```text
lyrics / story / emotional movement
        ↕
phrase structure
        ↕
melody / motifs
        ↕
harmony / tonal centre
        ↕
tempo / metre / rhythmic feel
        ↕
performance / rendition
```

A change in any one layer may reveal a reason to reconsider another.

The system should preserve this creative feedback loop rather than prematurely converting provisional evidence into permanent song structure.

### Lyrics as a songwriting foundation

For many songs, the lyrics provide an important creative bedrock.

The storyline, emotional movement, natural language stress, line shape, repeated ideas, tension, release, and conversational rhythm may suggest:

- where musical phrases naturally begin and end;
- where a thought carries forward rather than resolves;
- likely points of emphasis or restraint;
- possible melodic contour;
- recurring motifs;
- changes of register or intensity;
- harmonic tension and release;
- a natural tempo range or rhythmic feel;
- places where silence, breath, or instrumental response may be expressive.

These are **musical possibilities**, not deterministic rules.

The system may use lyrical structure and meaning to expose or propose musical relationships, but it must not assume that a lyric uniquely determines its melody, harmony, tempo, metre, or phrasing.

The purpose is to help musical ideas emerge from the song rather than impose a formula onto it.

### Song phrase structure and performance fragmentation are different things

The architecture must distinguish the underlying phrase structure of the song from the way one performer happens to realise it.

For example:

```text
Song phrase
"It won't be for-ever"

Performance A
"It won't be for" | "ever"

Performance B
"It won't be forever"

Performance C
"It won't" | "be forever"
```

All three performances may express the same underlying lyric or musical phrase.

A detected acoustic break therefore means:

> the captured performance separates here

It does **not** necessarily mean:

> the song itself has a phrase boundary here

Likewise, a continuous vocal gesture across two written lyric lines does not automatically mean those lines belong to one permanent song phrase.

The application should therefore maintain separate concepts for:

```text
SONG
lyric / musical phrase structure
        ↓ expressed through

RENDITION
the intended interpretation this time
        ↓ realised as

PERFORMANCE
the actual captured timing, breaths, pauses,
fragments, pitch gestures and expressive behaviour
```

Performance analysis supplies evidence about the rendition and may reveal important information about the song, but it must not silently redefine the song.

### Phrase structure should remain reviewable

Phrase structure may begin provisionally from:

- lyric meaning and syntax;
- natural spoken stress;
- songwriter decisions;
- existing melody or harmony;
- an established previous version;
- performance evidence;
- AI-assisted suggestions.

Those sources may disagree.

The system should preserve the distinction between:

```text
provisional interpretation
        ↓
reviewed songwriter decision
        ↓
durable song knowledge
```

A detected performance fragment may therefore be associated with a song phrase without becoming identical to it.

For example:

```text
Lyric phrase:
"It won't be for-ever"

Performance fragment 1:
"It won't be for"

Performance fragment 2:
"ever"
```

The two fragments should remain separately observable as performance evidence while both may belong to the same reviewed song phrase.

### Different renditions may legitimately reshape the song

A completed song is not frozen into one exact performance.

Another performer may legitimately alter:

- breath placement;
- phrase subdivision;
- note duration;
- ornamentation;
- register;
- timing;
- tempo;
- groove;
- emotional emphasis;
- melodic detail;
- harmonic treatment;
- arrangement.

Some of those changes belong only to that rendition. Others may reveal a compelling improvement to the underlying song and be deliberately adopted by the songwriter.

The architecture must therefore support movement in both directions:

```text
Song Identity
        ↓
informs rendition

Performance / rendition evidence
        ↓
may suggest revisions to Song Identity

Explicit songwriter review
        ↓
decides what becomes durable
```

No analysis layer should promote a performance characteristic into permanent Song Identity merely because it was measurable.

### Anti-formula principle

The application should help the songwriter discover, preserve, compare, and develop musical decisions.

It should not converge every song toward a mechanically regular solution.

In particular, the system must avoid assuming that:

- every lyric line is one musical phrase;
- every acoustic pause is a song phrase boundary;
- every phrase should have similar duration;
- every section should use a repeated contour pattern;
- every strong syllable requires a high note;
- every unstable pitch should be corrected;
- every unusual timing decision is an error;
- every song needs conventional harmonic or melodic resolution;
- every performance should become cleaner, smoother, or more quantised.

Regularity is valid when the song calls for it. Irregularity is equally valid when it carries musical or emotional meaning.

The guiding principle is:

> **Model evolving musical decisions; do not manufacture certainty from incomplete evidence.**

The system should remain capable of offering structure, analysis, suggestions, and alternatives without replacing the songwriter's judgement or reducing songwriting to a formula.

## Songwriter-controlled song state

The application's central creative object should be the **current songwriter-controlled state of the song**.

This state is not a fixed input and not a generated output. It is the evolving body of musical decisions that the songwriter may deliberately edit as the song develops.

It includes, at minimum:

- lyrics and section order;
- chord choices and chord placement;
- phrase structure;
- melody and recurring motifs;
- rhythmic relationships;
- important harmonic relationships;
- accepted structural decisions;
- other explicitly reviewed song-specific musical decisions.

The application should distinguish this songwriter-controlled state from analysis, suggestions, and rendition evidence.

```text
SONGWRITER-CONTROLLED SONG STATE
        │
        ├─ lyrics
        ├─ chords / harmony
        ├─ phrase structure
        ├─ melody / motifs
        ├─ rhythm
        └─ structure
        ↓
Rendition intent
        ↓
Performance / musical guide
        ↓
Performance evidence
        ↓
analysis / discoveries / suggestions
        └──────────────→ may inform further songwriter edits
```

Analysis and AI may propose changes, expose problems, or offer alternatives, but they must not silently modify the songwriter-controlled song state.

### Source as authoritative editable song material

Within the current application workflow, **Source** is the authoritative editable representation of the song material supplied by the songwriter.

Source may contain:

- lyrics;
- section markers and section order;
- chords;
- chord placements relative to the lyrics.

The application may process that combined Source into separate structured working representations for lyrics, sections, harmony, phrasing, melody, and other musical development.

That processing separation is an implementation and editing convenience. It must not imply that chords cease to belong to the songwriter-controlled song Source from which they originated.

If new lyrics are introduced, existing lyrics are rewritten, a lyrical Intro is added, or source chords are changed, those edits belong to Source.

Performance analysis and other downstream musical representations should then be associated against that updated Source. They should not redefine Source merely to preserve an old alignment or interpretation.

For example:

```text
Source before edit
[Verse 1]
Am
We went to war

Source after edit
[Intro]
F
Some opening lyric

[Verse 1]
Am
We went to war
```

A historical performance that begins with `We went to war` should not cause the new Intro lyric or chord to disappear or be treated as invalid.

Instead, its existing phrase-to-lyric and other downstream associations may require review against the changed Source.

Source authority therefore means:

> the current songwriter-controlled Source defines the song's present textual and source-level harmonic structure.

It does not mean that every downstream musical association remains valid after Source changes.

### Harmony is extracted from Source and remains editable

When chords are present in Source, the application may extract them into the structured Chords workflow so that they can be inspected, generated from, edited, moved, added, deleted, or replaced.

The existing ability to generate chords using the chords already provided by the song is an example of this relationship:

```text
Source containing lyrics + chords
        ↓
structured chord extraction
        ↓
Chords workflow
        ↓
preserve / edit / regenerate / develop
```

The extracted harmony remains part of the songwriter-controlled song state. Processing it separately does not make it independent of the Source from which it originated.

Chords should therefore remain fully editable musical decisions. The songwriter must be able to:

- change a chord name;
- add a new chord;
- delete a chord;
- move a chord placement;
- alter harmonic rhythm;
- reshape a progression;
- replace or simplify harmony;
- preserve a progression while refitting it to changed lyrics.

The existence of a chord in the current song state makes it the current harmonic decision. It does not make that chord permanently correct or immutable.

For example:

```text
Current song state:
Am

Analysis:
the vocal phrase creates tension against Am

Possible suggestion:
Fmaj7 may support the phrase differently
```

The analysis remains evidence and the suggested chord remains a possibility until the songwriter deliberately changes the harmony.

The same principle should eventually apply to melody, phrase structure, and other musical layers.

### Lyrics, harmony, melody and phrasing are peers

The application should not assume a permanently linear creative pipeline such as:

```text
lyrics
  ↓
generate chords
  ↓
generate melody
```

That sequence may be useful operationally at some stages, but it is not an adequate model of songwriting.

The underlying creative relationship is closer to:

```text
              LYRICS
             ↙      ↘
        PHRASING ↔ MELODY
             ↘      ↙
              CHORDS
```

with structure, rhythm, emotional intent, and performance interacting with all of them.

A lyric edit may require a melody change.

A melody may expose an awkward lyric.

A chord substitution may reveal a stronger melodic destination.

A phrase may require an extra bar.

A rhythmic idea may alter the natural wording.

An unusual harmonic moment may become part of the song's identity.

The application should therefore support movement between these layers without treating one as permanently downstream from another.

### Local changes should cause local review where possible

A songwriting edit should not automatically discard all established musical work.

Nor should the system silently assume that every existing relationship still fits.

For example:

```text
Old lyric:
"We didn't want to die"

New lyric:
"We never wanted to die"
```

The likely consequences may be:

```text
lyric text
    changed

phrase structure
    may need review

chord choice
    may still be valid

chord placement
    may need review

core melodic gesture
    may remain useful

exact melodic timing
    may need review

performance-fragment association
    may need review
```

Likewise, changing one chord should not require wholesale regeneration of the song if the surrounding melody, lyric, and structure remain compatible.

The preferred behaviour is:

```text
songwriter edit
        ↓
identify affected relationships
        ↓
preserve compatible accepted decisions
        ↓
flag only uncertain or invalidated relationships for review
```

This principle should guide future versioning, dependency tracking, and regeneration behaviour.

### Editable authority versus derived evidence

The architecture should preserve a strong distinction between:

```text
Songwriter-controlled decisions
    lyrics
    chords
    melody
    phrasing
    structure

Derived evidence
    pitch traces
    note candidates
    detected pauses
    performance fragments
    energy shapes
    analysis classifications

Suggestions
    AI alternatives
    harmonic possibilities
    melodic alternatives
    structural recommendations
```

Derived evidence and suggestions may influence songwriter decisions, but they must not become authoritative merely because they were computed.

The key rule is:

> **The songwriter-controlled song state is editable and authoritative for the current song; analysis and generation exist to help develop that state rather than replace it.**

### Relationship to Song Identity

The songwriter-controlled song state and Song Identity are related but not identical.

The current song state contains the songwriter's present decisions.

Song Identity represents the subset of those decisions and relationships that should remain recognisably this song across materially different renditions.

A current chord, exact note duration, lyric wording, or phrase division may later change while the song remains recognisably the same.

Conversely, some unusual lyric, melodic, harmonic, or rhythmic decision may become essential to the song's identity.

Promotion from current song state into durable Song Identity should therefore remain deliberate and reviewable rather than automatic.

## Why performance analysis exists

Recent Make Song development exposed an important limitation in the previous architecture.

A melody can be technically plausible, rhythmically aligned, harmonically compatible, and correctly rendered while still failing to feel like a convincing song.

The missing information is often not another chord, scale rule, section label, or rendering parameter. It is musical identity and expressive intent: what makes the song recognisable, what the songwriter is trying to communicate, and how a particular artist or rendition chooses to embody that intent.

A human performance may communicate musical meaning through:

- where a phrase enters or hesitates;
- which syllables are leaned on or allowed to fall away;
- imperfect or unstable pitch;
- slides, scoops and expressive dips;
- breath and pauses;
- dynamic shape;
- restrained, strained, intimate, raw, or deliberately unpolished delivery;
- timing that deliberately sits ahead of or behind the beat;
- melodic gestures that are difficult to describe adequately as discrete notes.

These characteristics may carry much of the sentiment of the song.

However, one recording is only one rendition. Genre, emotional direction, time signature, instrumentation, arrangement, tempo, register, groove, and performance context may all change materially while the song remains recognisably the same song.

A recording is therefore **evidence**, not the canonical song model.

Previous generated-melody work largely attempted to construct a credible musical result from lyrics, harmony, timing, Song Creative Profile, section intent, and phrase intent. That remains valuable for AI-assisted development, especially when no established melody exists or when the songwriter deliberately wants a different musical interpretation.

When a songwriter already has a musical idea, the system should not begin by replacing that idea with a newly fabricated melody. It should first ask what in the available evidence is likely to belong to the song itself, what belongs to the artist, and what belongs only to this particular rendition.

This creates an important distinction:

```text
AI-assisted
    creates or reinterprets musical possibilities

Songwriter-guided
    preserves, exposes and develops existing human musical decisions

Performance analysis
    measures one rendition and supplies evidence upward
    into song identity, Artist DNA and performance interpretation
```

The approaches are complementary rather than competing.

A songwriter may preserve the original melodic identity while using AI to explore harmony, arrangement, instrumentation, genre, metre, tempo, production direction, or alternative sections. The system must therefore preserve identity without freezing one exact performance.

## Song Identity, Artist DNA, and Rendition Model

The architecture should distinguish three reusable layers of musical knowledge.

### Song Identity Model

The Song Identity Model represents what should remain recognisably **this song** across materially different renditions.

Candidate durable characteristics may include:

- lyrical meaning and important lyrical-emotional relationships;
- core melodic identity and memorable melodic gestures;
- characteristic phrase shapes;
- important tension-and-release relationships;
- essential rhythmic identity;
- deliberate unusual moments;
- important harmonic relationships;
- explicitly protected songwriter decisions.

Song identity should be portable across genre, arrangement, instrumentation, tempo, metre, register, and production changes where musically appropriate.

It should not automatically contain every measurable property of one performance.

Song Identity should also not be treated as permanently fixed once established. It is durable enough to preserve continuity across development, but the songwriter may deliberately revise it as lyrics, melody, harmony, phrasing, or repeated performance reveal a stronger version of the song.

Durability means **preserve unless deliberately changed**, not **freeze permanently**.

### Artist DNA Model

Artist DNA represents persistent tendencies of the artist rather than properties of one song.

It may include evidence-based tendencies such as:

- vocal identity and usable register;
- characteristic phrase entry and release behaviour;
- melodic interval and contour tendencies;
- preferred degrees of pitch stability or rawness;
- recurring dynamic shapes;
- characteristic use of space, held notes, breath, restraint, or force;
- harmonic and genre tendencies;
- rhythmic placement tendencies;
- visual identity and other non-audio artist characteristics already supported elsewhere in the application.

Artist DNA is not a rigid performance preset. It describes tendencies that may be applied where relevant and overridden by explicit song or rendition intent.

Repeated evidence across multiple performances may strengthen an Artist DNA tendency. A single performance should not automatically become a permanent artist rule.

### Performance / Rendition Model

The Performance / Rendition Model represents how Song Identity and Artist DNA are expressed **this time**.

It may be conditioned by:

- genre;
- emotion / delivery intention;
- instrumentation;
- arrangement density;
- tempo;
- time signature / metre;
- groove;
- register;
- production direction;
- rehearsal or performance context.

A rendition may legitimately alter exact note timing, phrase duration, pauses, register, ornamentation, energy contour, or even some melodic treatment while preserving the song's essential identity.

The intended relationship is:

```text
Song Identity Model
        +
Artist DNA Model
        +
Rendition Intent
        ↓
Performance / Rendition Model
        ↓
Make Song / rehearsal / downstream generation
```

Where Artist DNA is unavailable, the system may use general musical-performance principles. Where no recording is available, songwriter decisions, lyrics, melody, harmony, structured intent, notation-like controls, played fragments, or AI-assisted development may still populate the Song Identity and Rendition models.

A recording must therefore remain optional.

### Authority and override hierarchy

The developing musical authority hierarchy should be:

1. explicit songwriter decision;
2. essential Song Identity;
3. explicit Rendition Intent;
4. relevant Artist DNA tendency;
5. general musical default.

Artist DNA must not override an explicit song-specific decision. Likewise, one historical performance must not silently override a deliberate reinterpretation.

## Songwriter Audio Model and performance evidence

A songwriter's original performance may contain musical information that cannot be represented adequately by note names alone.

The Songwriter Audio Model remains useful, but its role is now more precisely defined: it is a structured model of **performance evidence**, not the permanent definition of the song.

```text
Original human performance
        ↓
Performance analysis
        │
        ├─ continuous pitch gesture
        ├─ timing / phrasing
        ├─ dynamics / energy
        ├─ pauses / breath
        ├─ pitch instability
        ├─ slides / scoops / inflections
        └─ expressive delivery
        ↓
Songwriter Audio Model
        = structured evidence for this rendition
        ↓
Candidate durable knowledge
        │
        ├─ Song Identity evidence
        ├─ Artist DNA evidence
        └─ Rendition-specific behaviour
        ↓
Explicit songwriter review / acceptance where needed
```

The original recording remains the creative source of truth **for what was actually performed in that recording**.

It is not automatically the source of truth for every future rendition of the song.

Derived analysis is interpretation, not replacement.

The current authority hierarchy within audio analysis is:

```text
Original songwriter performance
        = authority for the captured performance

Optional vocal stem
        = analysis aid

Raw performance trace
        = measured analysis

Continuity-corrected trace
        = derived interpretation

Derived note candidates
        = musical interpretation

Phrase / expressive classifications
        = higher-level interpretation
```

No derived representation should overwrite or silently replace the original performance.

### Original performance and analysis aids

The persisted songwriter reference belongs primarily to the project rather than to one particular saved song version.

It represents source material that may predate and outlive individual lyric, chord, arrangement, or generated-audio versions.

The original imported file should be retained unchanged. Optional derived playback formats may be created later, but the original source must remain available for re-analysis.

A separated vocal stem may be used as an analysis aid when available.

The vocal stem is not the creative authority. It exists to improve analysis where accompaniment interferes with vocal pitch detection.

Current comparison work has established that:

- isolated vocals can materially reduce accompaniment-related octave errors;
- some pitch movement that initially appears to be detector instability is also present in the isolated vocal;
- therefore vocal movement around note boundaries must not automatically be smoothed away;
- mixed-audio and isolated-vocal analyses can be compared to distinguish likely accompaniment contamination from genuine vocal behaviour.

### Continuous expression before discrete notes

The songwriter-audio pipeline must not reduce a performance immediately to MIDI notes.

The preferred order is:

```text
Original audio
        ↓
Raw pitch / clarity / energy trace
        ↓
Continuity-aware correction
        ↓
Local pitch interpretation
        ↓
Derived note candidates
        ↓
Phrase and expressive-event interpretation
        ↓
Candidate higher-level musical knowledge
```

Raw and corrected traces must remain available beneath later musical interpretations.

A derived note is not automatically equivalent to an intended compositional note.

Short pitch movements may instead represent:

- a slide;
- a scoop;
- an expressive dip;
- pitch settling;
- vibrato or instability;
- a passing inflection;
- uncertain analysis.

The developing model should therefore distinguish stable pitch events from expressive transitions rather than forcing all pitch movement into discrete note changes.

### Expressive identity is musical data, but not every expressive detail is permanent

Timing looseness, delayed attacks, breath, strain, unstable sustain, roughness, restrained delivery, and imperfect pitch movement may be intentional and musically important.

They must not automatically be treated as defects to quantise, tune, smooth, or remove.

However, measured expressive behaviour must also be classified by scope:

```text
possible Song Identity
    characteristic of the composition

possible Artist DNA
    characteristic of the artist across songs / performances

Rendition-specific
    characteristic of this particular performance only
```

Where the system produces a cleaner, more conventional, or stylistically different interpretation, that should be an explicit creative choice rather than an automatic consequence of analysis.

A higher-level representation may support descriptions such as:

```text
Phrase
  core pitch gesture: rises into E4
  arrival: sustained E4
  entry: soft and slightly delayed
  approach: upward scoop
  sustain: intentionally unstable
  expressive dip: toward D#4
  release: falls away rather than ending cleanly
```

But such a description remains evidence until the songwriter or broader cross-performance analysis establishes which parts are durable song identity, Artist DNA, or merely this rendition.

### Current songwriter-audio implementation direction

The current implementation has established the following foundation:

- songwriter reference recordings are persisted as project-level human source material;
- the original imported file is retained unchanged;
- the reference restores automatically with the project;
- a selected passage can be analysed for raw pitch, detector clarity, and signal energy;
- continuity-aware correction reduces obvious octave and harmonic tracking errors while preserving the raw trace;
- derived note candidates provide a simplified musical interpretation without replacing the continuous trace;
- derived notes can be auditioned to check whether the analysis resembles the sung melody;
- an optional vocal stem can be used as an analysis source without replacing the original performance as creative authority;
- mixed-recording and vocal-stem comparison has demonstrated both accompaniment contamination and genuine expressive movement around note boundaries;
- stable-note regions and brief expressive rises/dips are distinguished;
- entry approaches, shared pitch transitions, and same-note internal settling can be classified without double-counting the same trace region;
- phrase-level dynamic shape can distinguish patterns such as arches and falls;
- phrase delivery can measure candidate-based occupancy, internal pauses, longest pause, inter-phrase space, and final-note duration.

A diagnostic attempt to align recording time directly to the generated lyric/melody scaffold established that the two clocks are not inherently shared. This is expected, especially for live, rough, or freely timed performances.

Do not assume one fixed offset between a human performance and a generated song timeline. A live performance may drift, stretch, compress, pause, or change tempo locally. Exact timing differences may themselves be expressive evidence.

The immediate development direction is therefore **not** deeper transcription or forced timeline registration. It is to use the performance-analysis foundation to extract candidate portable knowledge for Song Identity, Artist DNA, and Rendition Intent while keeping those scopes distinct.

Recording analysis must remain optional. The same higher-level models must also be supportable from explicit songwriter decisions, existing melody/harmony/lyric structures, partial sung or played fragments, and AI-assisted development where appropriate.

## Make Song and musical guide purpose

Make Song is intended to support song development and rehearsal, not to produce a polished performance backing track.

The generated musical guide should therefore be:

- pleasant and musically credible enough for repeated listening;
- clear enough to support singing, playing, rehearsal, and evaluation;
- accurate enough to expose problems in phrasing, chord placement, structure, and melody;
- restrained enough that accompaniment choices do not distract from the song itself.

Production polish is secondary to musical usefulness.

Melody, phrasing, chord placement, and expressive performance should progressively become explicit, editable, version-aware musical decisions rather than being treated only as rendered audio. The songwriter-guided path should preserve established human musical identity; the AI-assisted path may generate or reinterpret musical decisions where appropriate.

As a song develops:

- compatible chord, phrasing, and melody decisions should be preserved where the lyric and section still correspond;
- changed or newly introduced material should be identified explicitly;
- only affected musical material should need revision where possible;
- creating a new song version should not blindly discard established musical work.

The long-term target is a structured relationship between lyric phrases, phrase timing, chord events, and melody notes so that changes made during songwriting can be embodied reliably in subsequent song versions and musical guides.

Those relationships should support dependency-aware editing rather than one-way generation. Lyrics, chords, melody, phrasing, and structure should remain independently editable, with compatible accepted work preserved and only affected relationships flagged for review when one layer changes.

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

Artist-level identity, song-level identity, and rendition-specific intent must remain distinct:

- Artist DNA describes persistent artist tendencies across songs and performances.
- Song Creative Profile currently stores a small set of accepted song-level context such as genre, moods, theme, and emotional centre.
- The developing Song Identity Model will hold more specifically musical, portable identity that should survive reinterpretation where appropriate.
- Rendition Intent describes what is deliberately different about the current interpretation: genre, emotion, instrumentation, tempo, metre, arrangement, register, groove, production, and performance direction.

These layers may be combined downstream, but they must not be collapsed into one prompt or one recording. The existing Song Creative Profile remains useful and should evolve carefully rather than being replaced casually.

## Version provenance and working context

Human creative provenance and generated-artifact provenance are related but distinct.

Songwriter source provenance is project-level:

```text
Project
   ↓
Original songwriter reference (optional human evidence)
   ↓
Songwriter Audio Model / analysis derivatives
   ↓
Candidate Song Identity / Artist DNA / Rendition evidence
```

Durable musical knowledge has separate scope:

```text
Artist
  ↓
Artist DNA Model

Saved song / song family
  ↓
Song Identity Model

Specific rendition / performance context
  ↓
Rendition Intent / Performance Model
```

A single recording may contribute evidence to all three scopes, but it must not silently populate permanent Artist DNA or Song Identity without sufficient evidence or explicit songwriter acceptance.

The songwriter reference is human source material, not a generated Audio Guide and not a chord-checkpoint derivative.

It must not be invalidated merely because a new song version is created. Analysis derivatives may be regenerated as the analysis model improves while the original recording remains unchanged.

Generated musical artifacts retain their stricter provenance chain:

```text
Saved song version
        ↓
Linked saved chord checkpoint
        ↓
Guide Track / structured musical intent
        ↓
Audio Guide derived from that exact source context
```

A songwriter-guided development may later associate accepted melodic or expressive decisions with a saved song version, but that must not rewrite the provenance of the original project-level source recording.

An Audio Guide is derived not only from a specific saved song/chord pairing, but from the Guide Track and structured musical intent associated with that pairing.

## Make Song intent propagation

Make Song uses a structured musical-intent pipeline rather than relying on free-form performance text alone.

```text
Saved song version
        ↓
Linked saved chord checkpoint
        ↓
Guide Track plan
        ↓
Structured section intent ─────────────┐
                                       │
Lyrics + harmony + musical timing      │
        ↓                              │
Lyric timing                           │
        ↓                              │
Structured phrase intent               │
        ├─ contourIntent               │
        ├─ emphasisIntent              │
        └─ resolutionIntent            │
        ↓                              │
Melody phrase scaffold ────────────────┤
                                       ↓
                                 Melody engine
                                       ↓
                                 Audio renderer
                                       ↓
                                   Audio Guide
```

The Guide Track may contain both machine-readable structured intent and richer human-readable performance guidance.

Section intent and phrase intent are complementary rather than competing authorities.

- Guide Track / structured section intent describes how a whole section should broadly behave.
- Structured phrase intent describes how the meaning and emotional movement of an individual lyric phrase should move, be foregrounded, and arrive.
- The melody engine combines section intent, phrase intent, word rhythm, harmony, and timing.
- The audio renderer should render those structured decisions rather than reinterpret lyric meaning itself.

Fresh full Generate Chords and the dedicated Guide Track route must produce the same structured section-intent fields.

Structured intent should be used where the application can represent a musical decision deterministically. Free-form guidance should remain descriptive where the current melody or audio engine cannot represent it faithfully.

### Currently enacted Make Song intent

The following intent currently has a causal effect on generated Make Song audio:

- tempo;
- meter and bar timing;
- chord progression and harmonic timing;
- section dynamics through `dynamicStart` and `dynamicEnd`;
- section vocal register;
- section vocal lift;
- section vocal movement;
- section vocal delivery;
- section vocal entry;
- phrase contour intent through `settle`, `rise`, `arch`, `fall`, or `suspend`;
- phrase emphasis intent through `restrained`, `normal`, or `strong`;
- phrase resolution intent through `open`, `partial`, or `resolved`;
- section guitar accompaniment role derived from `guitarApproach`;
- section backbeat through `none`, `soft`, or `clear`;
- explicit bass exclusion such as `no bass`.

Section vocal intent is translated into melody-engine controls rather than interpreted directly from free-form vocal prose.

Generated Guide Track vocal intent provides section-level melody defaults. Explicit songwriter changes to melody section controls take precedence over regenerated Guide Track defaults.

Phrase intent is determined upstream during lyric-timing analysis from lyric meaning, emotional movement, natural language stress, delivery, surrounding phrases, and musical context.

Punctuation is weak optional evidence only and must not mechanically determine phrase contour, emphasis, resolution, or phrase boundaries.

Explicit phrase intent outranks generic section-label melody assumptions.

For reused motifs, established motif contour may remain authoritative where preserving recognisable melodic identity is musically useful. Occurrence-specific phrase emphasis and resolution may still vary independently of that reused contour.

Older saved data without phrase-intent fields remains valid through optional `MelodyPhrase` fields and existing fallback behaviour.

### Preserved but not currently enacted

Some musical intent is deliberately preserved without pretending that the current renderer supports it.

This currently includes:

- swing or swung subdivision feel;
- half-time feel;
- ritardando / rallentando or other tempo curves;
- global guitar tone such as warm, woody, gritty, or period-specific tone;
- detailed instrumentation beyond capabilities explicitly supported by the guide renderer;
- global vocal guide style;
- vocal colour and technique such as rasp, breathiness, vibrato, chest/head tone, or behind-the-beat delivery;
- free-form section feel / goal;
- free-form section notes.

These fields remain valuable planning context and may later feed richer melody, arrangement, synthesis, or external-provider workflows.

Do not make unsupported prose appear to have an audible effect merely because it reaches the renderer payload.

### Structured intent rule

A key design rule is:

> Do not interpret free-form musical prose inside the renderer when a structured representation is required for deterministic audio behaviour.

Where an intent becomes important enough for Make Song to enact, prefer adding a narrow structured representation and propagating it explicitly through the generation and rendering pipeline.

This is the approach currently used for section dynamics, section vocal melody intent, phrase melodic intent, accompaniment behaviour, and backbeat.

### Rehearsal and Make Song remain separate systems

The Rehearsal preview engine and Make Song serve different purposes.

Rehearsal controls are interactive audition controls. Make Song derives its musical-performance intent primarily from the saved chord checkpoint and Guide Track.

Currently:

- Rehearsal tempo is shared with Make Song;
- Rehearsal feel does not directly control Make Song;
- Rehearsal pattern does not directly control Make Song;
- Rehearsal instrument does not directly control Make Song;
- Rehearsal section selection does not directly control Make Song.

Do not casually connect Rehearsal pattern, feel, or instrument controls into Make Song, because this would create a second competing authority for arrangement intent.

The durable Make Song direction is:

```text
Song + saved chord checkpoint
        ↓
Guide Track / structured musical intent
        ↓
Make Song
```

while Rehearsal remains a lightweight interactive experimentation surface.

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


```

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

### Musical timing, harmony, lyric placement, and rendered time

Musical structure, harmony, lyric placement, vocal phrasing, and rendered playback time are related but distinct concepts. They must not be collapsed into one representation merely because the current implementation can derive one from another.

The durable relationship is:

```text
Song + songwriting intent
        ↓
Musical structure
musicalTimingPlan
        ↓
Harmony composition
harmonicTimeline
(section + chord + bar + beat)
        ↓
Chord / lyric visual fitting
songSheetLines
(lyric + charIndex + preserved harmonic event)
        ↓
Vocal phrasing
lyricTimingPlan
(text span + musical start/end)
        ↓
Performance interpretation
tempo map / expressive timing
        ↓
Rendered seconds / Audio Guide
```
