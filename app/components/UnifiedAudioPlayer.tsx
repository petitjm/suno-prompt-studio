"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  SharedSavedAudioTransport,
  type SavedAudioTransportSnapshot,
} from "../../lib/audio/shared-saved-audio-transport";

type UnifiedAudioPlayerProps = {
  transport: SharedSavedAudioTransport;
  title?: string;
  subtitle?: string;
  variant?: "compact" | "expanded";
  disabled?: boolean;

  // Optional workspace-specific behaviour.
  beforePlay?: () => void | Promise<void>;
  onSeek?: (seconds: number) => void;

  // Existing waveform and musical displays can be reused here.
  children?: ReactNode;
};

const EMPTY_SNAPSHOT: SavedAudioTransportSnapshot = {
  sourceUrl: "",
  currentTime: 0,
  duration: 0,
  playing: false,
  ready: false,
  ended: false,
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function UnifiedAudioPlayer({
  transport,
  title = "Audio Guide",
  subtitle,
  variant = "compact",
  disabled = false,
  beforePlay,
  onSeek,
  children,
}: UnifiedAudioPlayerProps) {
  const [snapshot, setSnapshot] =
    useState<SavedAudioTransportSnapshot>(EMPTY_SNAPSHOT);

  const [error, setError] = useState("");

  useEffect(() => {
    return transport.subscribe(setSnapshot);
  }, [transport]);

  const hasSource = Boolean(snapshot.sourceUrl);
  const canPlay = hasSource && !disabled;
  const canSeek = hasSource && snapshot.ready && snapshot.duration > 0;

  const currentTime = Math.min(
    snapshot.currentTime,
    snapshot.duration > 0 ? snapshot.duration : snapshot.currentTime,
  );

  const handlePlayPause = async () => {
    if (!canPlay) return;

    setError("");

    if (snapshot.playing) {
      transport.pause();
      return;
    }

    try {
      await beforePlay?.();
      await transport.play();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Audio playback could not start.",
      );
    }
  };

  const handleStop = () => {
    transport.stop();
    onSeek?.(0);
    setError("");
  };

  const handleSeek = (seconds: number) => {
    transport.seek(seconds);
    onSeek?.(seconds);
  };

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-950 p-3 text-gray-100">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>

          {subtitle && (
            <div className="mt-1 truncate text-xs text-gray-400">
              {subtitle}
            </div>
          )}
        </div>

        <span className="shrink-0 rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-400">
          {snapshot.playing ? "Playing" : "Audio Guide"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handlePlayPause()}
          disabled={!canPlay}
          aria-label={snapshot.playing ? "Pause" : "Play"}
          className="min-w-16 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {snapshot.playing ? "Pause" : "Play"}
        </button>

        <button
          type="button"
          onClick={handleStop}
          disabled={!canPlay}
          className="rounded-lg border border-gray-600 px-3 py-2 text-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Stop
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={snapshot.duration || 1}
            step={0.1}
            value={canSeek ? currentTime : 0}
            disabled={!canSeek || disabled}
            aria-label="Audio playback position"
            onChange={(event) => handleSeek(Number(event.target.value))}
            className="w-full accent-blue-500"
          />

          <div className="mt-1 flex justify-between gap-2 text-xs tabular-nums text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(snapshot.duration)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {variant === "expanded" && children && (
        <div className="mt-3 border-t border-gray-800 pt-3">{children}</div>
      )}
    </section>
  );
}
