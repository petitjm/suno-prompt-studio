"use client";

export type AudioGuideMixKey =
  "click" | "section" | "chordMarker" | "pad" | "arpeggio" | "bass" | "melody";

export type AudioGuideLayerSettings = {
  countIn: boolean;
  beatClicks: boolean;
  sectionMarkers: boolean;
  chordMarkers: boolean;
  chordToneGuide: boolean;
};

export type AudioGuideConfigurationProps = {
  layers: AudioGuideLayerSettings;
  onLayersChange: (layers: AudioGuideLayerSettings) => void;

  mixLevels: Record<AudioGuideMixKey, number>;
  onMixLevelChange: (key: AudioGuideMixKey, value: number) => void;

  onAudition?: (key: AudioGuideMixKey) => void;
  onOpenLiveMixer?: () => void;
  onApplyPreset?: (layers: AudioGuideLayerSettings) => void;
};

const LAYER_LABELS: {
  key: keyof AudioGuideLayerSettings;
  label: string;
}[] = [
  { key: "countIn", label: "Count-in" },
  { key: "beatClicks", label: "Beat clicks" },
  { key: "sectionMarkers", label: "Section markers" },
  { key: "chordMarkers", label: "Chord markers" },
  { key: "chordToneGuide", label: "Chord guide tones" },
];

const MIX_LABELS: {
  key: AudioGuideMixKey;
  label: string;
}[] = [
  { key: "click", label: "Beat click" },
  { key: "section", label: "Section marker" },
  { key: "chordMarker", label: "Chord tick" },
  { key: "pad", label: "Chord pad" },
  { key: "arpeggio", label: "Arpeggio" },
  { key: "bass", label: "Bass root" },
  { key: "melody", label: "Melody guide" },
];

export default function AudioGuideConfigurationPanel({
  layers,
  onLayersChange,
  mixLevels,
  onMixLevelChange,
  onAudition,
  onOpenLiveMixer,
  onApplyPreset,
}: AudioGuideConfigurationProps) {
  return (
    <section className="rounded border border-gray-700 bg-gray-950 p-4">
      <h3 className="mb-3 font-semibold text-blue-100">
        Audio Guide Configuration
      </h3>

      {onApplyPreset && (
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-gray-300">
            Audio Guide layer presets
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "Plain click",
                layers: {
                  countIn: false,
                  beatClicks: true,
                  sectionMarkers: false,
                  chordMarkers: false,
                  chordToneGuide: false,
                },
              },
              {
                label: "Basic count-in",
                layers: {
                  countIn: true,
                  beatClicks: true,
                  sectionMarkers: false,
                  chordMarkers: false,
                  chordToneGuide: false,
                },
              },
              {
                label: "Structure guide",
                layers: {
                  countIn: true,
                  beatClicks: true,
                  sectionMarkers: true,
                  chordMarkers: false,
                  chordToneGuide: false,
                },
              },
              {
                label: "Audio Guide",
                layers: {
                  countIn: true,
                  beatClicks: true,
                  sectionMarkers: true,
                  chordMarkers: true,
                  chordToneGuide: true,
                },
              },
              {
                label: "Music only",
                layers: {
                  countIn: false,
                  beatClicks: false,
                  sectionMarkers: false,
                  chordMarkers: false,
                  chordToneGuide: true,
                },
              },
              {
                label: "Full rehearsal",
                layers: {
                  countIn: true,
                  beatClicks: true,
                  sectionMarkers: true,
                  chordMarkers: true,
                  chordToneGuide: true,
                },
              },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onApplyPreset(preset.layers)}
                className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {LAYER_LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={(event) =>
                onLayersChange({
                  ...layers,
                  [key]: event.target.checked,
                })
              }
            />
            {label}
          </label>
        ))}
      </div>

      <div className="mt-5 border-t border-gray-800 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-semibold text-blue-100">Audio Guide mix</h4>

          {onOpenLiveMixer && (
            <button
              type="button"
              onClick={onOpenLiveMixer}
              className="rounded border border-blue-600 bg-blue-950 px-3 py-2 text-xs font-medium text-blue-100 hover:bg-blue-900"
            >
              Open Live Mixer / Listen
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MIX_LABELS.map(({ key, label }) => {
            const value = mixLevels[key];

            return (
              <div key={key} className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{label}</span>

                  <div className="flex items-center gap-2">
                    <span>{Math.round(value * 100)}%</span>

                    {onAudition && (
                      <button
                        type="button"
                        onClick={() => onAudition(key)}
                        className="rounded border border-blue-700 px-2 py-1 text-xs text-blue-100 hover:bg-blue-950"
                      >
                        Audition
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={value}
                  onChange={(event) =>
                    onMixLevelChange(key, Number(event.target.value))
                  }
                  onPointerUp={() => onAudition?.(key)}
                  onKeyUp={(event) => {
                    if (
                      event.key === "ArrowLeft" ||
                      event.key === "ArrowRight" ||
                      event.key === "Home" ||
                      event.key === "End"
                    ) {
                      onAudition?.(key);
                    }
                  }}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-gray-400">
          These mix levels are shared across workspaces. Changes affect the next
          rendered Audio Guide. Existing WAV and MP3 recordings retain their
          original mix.
        </p>
      </div>
    </section>
  );
}
