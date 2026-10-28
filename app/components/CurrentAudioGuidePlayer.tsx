"use client";

type Props = {
  audioUrl: string;
  audioLabel: string;
  audioSource: string;
  audioFormat: string;
  audioVersionId: string;
  tempoBpm: number;
  onOpenLiveMixer: () => void;
};

export default function CurrentAudioGuidePlayer({
  audioUrl,
  audioLabel,
  audioSource,
  audioFormat,
  audioVersionId,
  tempoBpm,
  onOpenLiveMixer,
}: Props) {
  if (!audioUrl) {
    return (
      <section className="rounded border border-gray-700 bg-gray-950 p-4">
        <h3 className="font-semibold text-blue-100">Current Audio Guide</h3>
        <p className="mt-2 text-sm text-gray-400">
          No Audio Guide recording is currently loaded. Existing saved versions
          can be selected from the established song workflow.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded border border-gray-700 bg-gray-950 p-4">
      <div>
        <h3 className="font-semibold text-blue-100">Current Audio Guide</h3>
        <p className="mt-1 text-sm text-green-200">{audioLabel}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
        <span>
          {audioSource === "persisted"
            ? "Saved recording"
            : "Current-session recording"}
        </span>

        <span>{audioFormat.toUpperCase()}</span>
        <span>{tempoBpm} BPM</span>

        {audioVersionId && <span>Audio version: {audioVersionId}</span>}
      </div>

      <p className="text-xs text-gray-400">
        This is an existing mixed recording. Use the live mixer to adjust
        independently rendered audio components.
      </p>

      <button
        type="button"
        onClick={onOpenLiveMixer}
        className="rounded border border-blue-700 bg-blue-950/30 px-3 py-2 text-xs font-medium text-blue-100 hover:bg-blue-900/40"
      >
        Open Live Audio Guide Mixer
      </button>
    </section>
  );
}
