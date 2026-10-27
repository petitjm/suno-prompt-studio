"use client";

import { useEffect, useRef, useState } from "react";

import {
  AUDIO_STEM_KEYS,
  type AudioStemKey,
  type AudioStemLevels,
} from "@/lib/audio/mix-audio-stems";

import { decodeAudioStemPackage } from "@/lib/audio/audio-stem-transport";

import { LiveAudioGuidePlayer } from "@/lib/audio/live-audio-guide-player";

const STEM_LABELS: Record<AudioStemKey, string> = {
  click: "Beat click / backbeat",
  section: "Section markers",
  chordMarker: "Chord markers",
  pad: "Chord pad",
  arpeggio: "Arpeggio",
  bass: "Bass",
  melody: "Melody",
};

type Props = {
  enabled: boolean;
  blockedReason?: string;
  onResolveBlocked?: () => void;
  getRequestBody: () => Record<string, unknown>;
  levels: AudioStemLevels;
  onLevelChange: (key: AudioStemKey, value: number) => void;
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

export default function LiveAudioGuideMixer({
  enabled,
  blockedReason,
  onResolveBlocked,
  getRequestBody,
  levels,
  onLevelChange,
}: Props) {
  const playerRef = useRef<LiveAudioGuidePlayer | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState("");

  const [muted, setMuted] = useState<AudioStemKey[]>([]);
  const [solo, setSolo] = useState<AudioStemKey[]>([]);
  const [masterLevel, setMasterLevel] = useState(0.65);

  // Existing mix settings also control the loaded preview.
  useEffect(() => {
    playerRef.current?.setMix({
      levels,
      muted,
      solo,
      masterLevel,
    });
  }, [levels, muted, solo, masterLevel]);

  // Keep the transport display in sync with Web Audio playback.
  useEffect(() => {
    if (!ready) return;

    let frame = 0;
    let previousUpdate = 0;

    const update = (timestamp: number) => {
      const player = playerRef.current;

      if (player && timestamp - previousUpdate >= 100) {
        const nextPosition = player.getPosition();

        setPosition(nextPosition);
        setPlaying(player.isPlaying());
        previousUpdate = timestamp;
      }

      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frame);
  }, [ready]);

  // Release the AudioContext and temporary buffers on unmount.
  useEffect(() => {
    return () => {
      requestRef.current?.abort();

      const player = playerRef.current;
      playerRef.current = null;

      if (player) void player.dispose();
    };
  }, []);

  const preparePreview = async () => {
    if (loading || !enabled) return;

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);
    setMessage("Rendering temporary Audio Guide stems...");

    try {
      const requestBody = {
        ...getRequestBody(),
        enableRealClickTrackWavDownload: false,
        enablePersistentMp3Render: false,
        enableLiveStemPreview: true,
      };

      const response = await fetch("/api/audio-preview/real-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Stem preview failed (${response.status}): ${errorText.slice(0, 400)}`,
        );
      }

      if (
        !response.headers
          .get("Content-Type")
          ?.includes("application/octet-stream")
      ) {
        throw new Error("Unexpected stem preview response.");
      }

      const binary = await response.arrayBuffer();

      if (controller.signal.aborted) return;

      const decoded = decodeAudioStemPackage(binary);

      const nextPlayer = new LiveAudioGuidePlayer({
        levels,
        muted,
        solo,
        masterLevel,
      });

      try {
        nextPlayer.loadStems(decoded.stems, decoded.sampleRateHz);
      } catch (error) {
        await nextPlayer.dispose();
        throw error;
      }

      if (controller.signal.aborted) {
        await nextPlayer.dispose();
        return;
      }

      const previousPlayer = playerRef.current;
      playerRef.current = nextPlayer;

      if (previousPlayer) void previousPlayer.dispose();

      setDuration(nextPlayer.getDuration());
      setPosition(0);
      setPlaying(false);
      setReady(true);

      setMessage(
        "Preview ready. Adjust levels, mute or solo while listening. Nothing has been saved or downloaded.",
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not prepare live Audio Guide.",
        );
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const togglePlayback = async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (player.isPlaying()) {
        player.pause();
        setPlaying(false);
      } else {
        await player.play();
        setPlaying(player.isPlaying());
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Playback failed.");
    }
  };

  const seek = (seconds: number) => {
    const player = playerRef.current;
    if (!player) return;

    player.seek(seconds);
    setPosition(player.getPosition());
    setPlaying(player.isPlaying());
  };

  const toggleStem = (
    key: AudioStemKey,
    items: AudioStemKey[],
    update: (keys: AudioStemKey[]) => void,
  ) => {
    update(
      items.includes(key)
        ? items.filter((item) => item !== key)
        : [...items, key],
    );
  };

  return (
    <div className="mt-3 space-y-3 rounded border border-blue-700 bg-blue-950/20 p-3">
      <div>
        <div className="text-sm font-semibold text-blue-100">
          Live Audio Guide Preview
        </div>
        <p className="mt-1 text-xs text-blue-200">
          Render once, then mix while listening. Experimental audio remains in
          this browser session.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void preparePreview()}
        disabled={!enabled || loading}
        className="rounded bg-blue-700 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Preparing live preview..."
          : ready
            ? "Regenerate live preview"
            : "Prepare live preview"}
      </button>

      {!enabled && !ready && (
        <div className="space-y-2 rounded border border-yellow-900/50 bg-yellow-950/20 p-3">
          <p className="text-xs leading-5 text-yellow-100">
            {blockedReason ||
              "The current Audio Guide rendering plan is not ready."}
          </p>

          {onResolveBlocked && (
            <button
              type="button"
              onClick={onResolveBlocked}
              className="rounded border border-yellow-700 px-3 py-1.5 text-xs font-medium text-yellow-100 hover:bg-yellow-950"
            >
              Open Audio Guide preparation
            </button>
          )}
        </div>
      )}

      {message && (
        <p role="status" className="text-xs text-blue-100">
          {message}
        </p>
      )}

      {ready && (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void togglePlayback()}
              className="rounded border border-blue-600 px-3 py-1.5 text-xs text-blue-100"
            >
              {playing ? "Pause" : "Play"}
            </button>

            <button
              type="button"
              onClick={() => seek(0)}
              className="rounded border border-blue-600 px-3 py-1.5 text-xs text-blue-100"
            >
              Restart
            </button>

            <span className="text-xs text-blue-100">
              {formatTime(position)} / {formatTime(duration)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={Math.min(position, duration)}
            onChange={(event) => seek(Number(event.target.value))}
            className="w-full"
            aria-label="Live Audio Guide playback position"
          />

          <div className="space-y-3">
            {AUDIO_STEM_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-blue-100">
                    {STEM_LABELS[key]}
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-200">
                      {Math.round(levels[key] * 100)}%
                    </span>

                    <button
                      type="button"
                      aria-pressed={muted.includes(key)}
                      onClick={() => toggleStem(key, muted, setMuted)}
                      className={`rounded border px-2 py-1 text-xs ${
                        muted.includes(key)
                          ? "border-red-500 bg-red-900 text-white"
                          : "border-blue-700 text-blue-100"
                      }`}
                    >
                      M
                    </button>

                    <button
                      type="button"
                      aria-pressed={solo.includes(key)}
                      onClick={() => toggleStem(key, solo, setSolo)}
                      className={`rounded border px-2 py-1 text-xs ${
                        solo.includes(key)
                          ? "border-yellow-400 bg-yellow-800 text-white"
                          : "border-blue-700 text-blue-100"
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={levels[key]}
                  onChange={(event) =>
                    onLevelChange(key, Number(event.target.value))
                  }
                  className="w-full"
                  aria-label={`${STEM_LABELS[key]} level`}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-blue-800 pt-3">
            <label className="flex items-center justify-between text-xs text-blue-100">
              <span>Master output</span>
              <span>{Math.round(masterLevel * 100)}%</span>
            </label>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={masterLevel}
              onChange={(event) => setMasterLevel(Number(event.target.value))}
              className="w-full"
              aria-label="Live preview master output"
            />
          </div>

          <div className="flex justify-between gap-2 text-xs text-blue-200">
            <span>M = Mute · S = Solo</span>
            <button
              type="button"
              onClick={() => {
                setMuted([]);
                setSolo([]);
                setMasterLevel(0.65);
              }}
              className="underline"
            >
              Reset mute / solo / master
            </button>
          </div>
        </>
      )}
    </div>
  );
}
