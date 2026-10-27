"use client";

type MusicalConfigurationSummaryProps = {
  originalKey: string;
  performanceKey: string;
  transposeSemitones: number;
  tempoBpm: number;
  rehearsalInstrument: string;
  melodySource: string;
  countInEnabled: boolean;
  beatClicksEnabled: boolean;
};

export default function MusicalConfigurationSummary({
  originalKey,
  performanceKey,
  transposeSemitones,
  tempoBpm,
  rehearsalInstrument,
  melodySource,
  countInEnabled,
  beatClicksEnabled,
}: MusicalConfigurationSummaryProps) {
  const configurationItems = [
    {
      label: "Original key",
      value: originalKey || "Not established",
    },
    {
      label: "Performance key",
      value: performanceKey || "Not established",
    },
    {
      label: "Transposition",
      value:
        transposeSemitones === 0
          ? "None"
          : `${transposeSemitones > 0 ? "+" : ""}${transposeSemitones} semitones`,
    },
    {
      label: "Tempo",
      value: `${tempoBpm} BPM`,
    },
    {
      label: "Rehearsal instrument",
      value:
        rehearsalInstrument === "guitar"
          ? "Guitar"
          : rehearsalInstrument === "piano"
            ? "Piano"
            : rehearsalInstrument,
    },
    {
      label: "Melody",
      value: melodySource,
    },
    {
      label: "Audio Guide count-in",
      value: countInEnabled ? "On" : "Off",
    },
    {
      label: "Audio Guide beat clicks",
      value: beatClicksEnabled ? "On" : "Off",
    },
  ];

  return (
    <section
      aria-label="Current musical configuration"
      className="mb-4 rounded border border-blue-800 bg-blue-950/20 p-3"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-blue-100">
          Current Musical Configuration
        </h3>
        <span className="text-[11px] text-blue-300">
          Current working settings
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {configurationItems.map((item) => (
          <div
            key={item.label}
            className="rounded border border-gray-800 bg-gray-900/70 p-2"
          >
            <div className="text-[11px] text-gray-400">{item.label}</div>
            <div className="mt-1 text-xs font-medium text-gray-100">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-blue-200">
        These values describe the current working musical context. Rehearsal
        instrument selection does not necessarily determine the sound used by
        the rendered Audio Guide.
      </p>
    </section>
  );
}
