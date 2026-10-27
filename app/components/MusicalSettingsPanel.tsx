"use client";

import type {
  PreviewFeel,
  PreviewInstrument,
  PreviewPattern,
} from "@/types/song";

type MixKey =
  "click" | "section" | "chordMarker" | "pad" | "arpeggio" | "bass" | "melody";

type Props = {
  onOpenLiveMixer: () => void;
  originalKey: string;
  performanceKey: string;
  transposeSemitones: number;
  onTransposeChange: (value: number) => void;

  tempoBpm: number;
  onTempoChange: (value: number) => void;

  instrument: PreviewInstrument;
  onInstrumentChange: (value: PreviewInstrument) => void;

  feel: PreviewFeel;
  onFeelChange: (value: PreviewFeel) => void;

  pattern: PreviewPattern;
  onPatternChange: (value: PreviewPattern) => void;

  melodySource: string;

  countIn: boolean;
  onCountInChange: (value: boolean) => void;

  beatClicks: boolean;
  onBeatClicksChange: (value: boolean) => void;

  sectionMarkers: boolean;
  onSectionMarkersChange: (value: boolean) => void;

  chordMarkers: boolean;
  onChordMarkersChange: (value: boolean) => void;

  mixLevels: Record<MixKey, number>;
  onMixLevelChange: (key: MixKey, value: number) => void;
};

const MIX_LABELS: Record<MixKey, string> = {
  click: "Beat click / backbeat",
  section: "Section marker",
  chordMarker: "Chord marker",
  pad: "Chord pad",
  arpeggio: "Arpeggio",
  bass: "Bass",
  melody: "Melody",
};

export default function MusicalSettingsPanel({
  originalKey,
  performanceKey,
  transposeSemitones,
  onTransposeChange,
  tempoBpm,
  onTempoChange,
  instrument,
  onInstrumentChange,
  feel,
  onFeelChange,
  pattern,
  onPatternChange,
  melodySource,
  countIn,
  onCountInChange,
  beatClicks,
  onBeatClicksChange,
  sectionMarkers,
  onSectionMarkersChange,
  chordMarkers,
  onChordMarkersChange,
  mixLevels,
  onMixLevelChange,
  onOpenLiveMixer,
}: Props) {
  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="text-xl font-semibold text-white">Musical Settings</h2>
        <p className="mt-1 text-sm text-gray-400">
          Review and adjust the musical settings used throughout songwriting,
          rehearsal and Audio Guide preparation.
        </p>
      </div>

      <section className="rounded border border-gray-700 bg-gray-950 p-4">
        <h3 className="mb-3 font-semibold text-blue-100">
          Key and transposition
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-sm">
            <div className="text-gray-400">Original key</div>
            <div>{originalKey || "Not established"}</div>
          </div>

          <div className="text-sm">
            <div className="text-gray-400">Performance key</div>
            <div>{performanceKey || "Not established"}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onTransposeChange(transposeSemitones - 1)}
            className="rounded border border-gray-600 px-3 py-2 text-sm"
          >
            − Semitone
          </button>

          <span className="text-sm">
            {transposeSemitones > 0 ? "+" : ""}
            {transposeSemitones}
          </span>

          <button
            type="button"
            onClick={() => onTransposeChange(transposeSemitones + 1)}
            className="rounded border border-gray-600 px-3 py-2 text-sm"
          >
            + Semitone
          </button>

          <button
            type="button"
            onClick={() => onTransposeChange(0)}
            disabled={transposeSemitones === 0}
            className="rounded border border-gray-600 px-3 py-2 text-sm disabled:opacity-40"
          >
            Original key
          </button>
        </div>
      </section>

      <section className="rounded border border-gray-700 bg-gray-950 p-4">
        <h3 className="mb-3 font-semibold text-blue-100">
          Tempo and rehearsal
        </h3>

        <label className="block text-sm">
          Tempo: {tempoBpm} BPM
          <input
            type="range"
            min={50}
            max={180}
            step={1}
            value={tempoBpm}
            onChange={(event) => onTempoChange(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-gray-400">
              Rehearsal instrument
            </span>
            <select
              value={instrument}
              onChange={(event) =>
                onInstrumentChange(event.target.value as PreviewInstrument)
              }
              className="w-full rounded bg-gray-800 p-2"
            >
              <option value="guitar">Guitar</option>
              <option value="piano">Piano</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-gray-400">Rhythmic feel</span>
            <select
              value={feel}
              onChange={(event) =>
                onFeelChange(event.target.value as PreviewFeel)
              }
              className="w-full rounded bg-gray-800 p-2"
            >
              <option value="straight">Straight</option>
              <option value="swing">Swing</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-gray-400">Playing pattern</span>
            <select
              value={pattern}
              onChange={(event) =>
                onPatternChange(event.target.value as PreviewPattern)
              }
              className="w-full rounded bg-gray-800 p-2"
            >
              <option value="ballad_strum">Ballad strum</option>
              <option value="country_train">Country train</option>
              <option value="fingerpick">Fingerpick</option>
              <option value="piano_block">Piano block</option>
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Rehearsal instrument, feel and pattern control the rehearsal preview.
          They are distinct from the Section Plan's arrangement instructions.
        </p>
      </section>

      <section className="rounded border border-gray-700 bg-gray-950 p-4">
        <h3 className="font-semibold text-blue-100">Melody and performance</h3>

        <p className="mt-2 text-sm">Current melody source: {melodySource}</p>

        <p className="mt-2 text-xs text-gray-400">
          Melody creation, selection and expressive interpretation remain in the
          existing songwriting workflow.
        </p>
      </section>

      <section className="rounded border border-gray-700 bg-gray-950 p-4">
        <h3 className="mb-3 font-semibold text-blue-100">
          Audio Guide options
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Include count-in", countIn, onCountInChange],
            ["Include beat clicks", beatClicks, onBeatClicksChange],
            ["Include section markers", sectionMarkers, onSectionMarkersChange],
            ["Include chord markers", chordMarkers, onChordMarkersChange],
          ].map(([label, value, onChange]) => (
            <label
              key={String(label)}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={value as boolean}
                onChange={(event) =>
                  (onChange as (value: boolean) => void)(event.target.checked)
                }
              />
              {String(label)}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded border border-gray-700 bg-gray-950 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-blue-100">
            Audio Guide mix and listening
          </h3>

          <button
            type="button"
            onClick={onOpenLiveMixer}
            className="rounded border border-blue-600 bg-blue-950 px-3 py-2 text-xs font-medium text-blue-100 hover:bg-blue-900"
          >
            Open Live Mixer / Listen
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(MIX_LABELS) as MixKey[]).map((key) => (
            <label key={key} className="block text-sm">
              <span className="flex justify-between gap-2">
                <span>{MIX_LABELS[key]}</span>
                <span>{Math.round(mixLevels[key] * 100)}%</span>
              </span>

              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={mixLevels[key]}
                onChange={(event) =>
                  onMixLevelChange(key, Number(event.target.value))
                }
                className="mt-2 w-full"
              />
            </label>
          ))}
        </div>

        <p className="mt-3 text-xs text-gray-400">
          These levels also control a loaded live Audio Guide preview. Saved
          MP3/WAV recordings retain their existing mix until a new version is
          rendered or exported.
        </p>
      </section>
    </div>
  );
}
