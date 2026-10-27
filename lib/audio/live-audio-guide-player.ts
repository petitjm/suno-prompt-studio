import {
  AUDIO_STEM_KEYS,
  type AudioStemBuffers,
  type AudioStemKey,
  type AudioStemLevels,
} from "./mix-audio-stems";

export type LiveAudioGuideMix = {
  levels: AudioStemLevels;
  muted: AudioStemKey[];
  solo: AudioStemKey[];
  masterLevel: number;
};

export class LiveAudioGuidePlayer {
  private context: AudioContext;
  private master: GainNode;
  private limiter: DynamicsCompressorNode;

  private buffers = new Map<AudioStemKey, AudioBuffer>();
  private gains = new Map<AudioStemKey, GainNode>();
  private sources: AudioBufferSourceNode[] = [];

  private mix: LiveAudioGuideMix;
  private durationSeconds = 0;
  private positionSeconds = 0;
  private startedAt = 0;
  private playing = false;
  private disposed = false;

  constructor(initialMix: LiveAudioGuideMix) {
    this.context = new AudioContext();

    this.master = this.context.createGain();
    this.limiter = this.context.createDynamicsCompressor();

    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;

    this.master.connect(this.limiter);
    this.limiter.connect(this.context.destination);

    this.mix = {
      ...initialMix,
      levels: { ...initialMix.levels },
      muted: [...initialMix.muted],
      solo: [...initialMix.solo],
    };

    for (const key of AUDIO_STEM_KEYS) {
      const gain = this.context.createGain();
      gain.connect(this.master);
      this.gains.set(key, gain);
    }

    this.updateMix();
  }

  private assertActive() {
    if (this.disposed) {
      throw new Error("Audio Guide player has been disposed.");
    }
  }

  loadStems(stems: AudioStemBuffers, sampleRateHz: number) {
    this.assertActive();
    this.stopSources();

    if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
      throw new Error("Invalid stem sample rate.");
    }

    const available = AUDIO_STEM_KEYS.filter(
      (key) => stems[key] instanceof Float32Array,
    );

    if (available.length === 0) {
      throw new Error("No Audio Guide stems available.");
    }

    const frameCount = stems[available[0]]!.length;

    if (
      frameCount === 0 ||
      available.some((key) => stems[key]!.length !== frameCount)
    ) {
      throw new Error("Audio Guide stems must have equal, nonzero lengths.");
    }

    this.buffers.clear();

    for (const key of available) {
      const samples = stems[key]!;

      const buffer = this.context.createBuffer(1, frameCount, sampleRateHz);

      // Copy into the AudioBuffer's own channel storage.
      // This avoids the ArrayBufferLike / ArrayBuffer typing mismatch.
      buffer.getChannelData(0).set(samples);

      this.buffers.set(key, buffer);
    }

    this.durationSeconds = frameCount / sampleRateHz;
    this.positionSeconds = 0;
    this.playing = false;
  }

  private stopSources() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // An already-ended source needs no further action.
      }

      source.disconnect();
    }

    this.sources = [];
    this.playing = false;
  }

  private updateMix() {
    const muted = new Set(this.mix.muted);
    const solo = new Set(this.mix.solo);

    const now = this.context.currentTime;

    for (const key of AUDIO_STEM_KEYS) {
      const gain = this.gains.get(key);
      if (!gain) continue;

      const level = this.mix.levels[key];

      const enabled = !muted.has(key) && (solo.size === 0 || solo.has(key));

      const safeLevel = Number.isFinite(level)
        ? Math.max(0, Math.min(2, level))
        : 0;

      gain.gain.setTargetAtTime(enabled ? safeLevel : 0, now, 0.01);
    }

    const masterLevel = Number.isFinite(this.mix.masterLevel)
      ? Math.max(0, Math.min(2, this.mix.masterLevel))
      : 0;

    this.master.gain.setTargetAtTime(masterLevel, now, 0.01);
  }

  setMix(nextMix: LiveAudioGuideMix) {
    this.assertActive();

    this.mix = {
      ...nextMix,
      levels: { ...nextMix.levels },
      muted: [...nextMix.muted],
      solo: [...nextMix.solo],
    };

    this.updateMix();
  }

  async play() {
    this.assertActive();

    if (this.playing || this.buffers.size === 0) {
      return;
    }

    if (this.positionSeconds >= this.durationSeconds) {
      this.positionSeconds = 0;
    }

    await this.context.resume();
    this.stopSources();

    const startAt = this.context.currentTime + 0.03;

    for (const [key, buffer] of this.buffers) {
      const source = this.context.createBufferSource();

      source.buffer = buffer;
      source.connect(this.gains.get(key)!);
      source.start(startAt, this.positionSeconds);

      this.sources.push(source);
    }

    this.startedAt = startAt - this.positionSeconds;
    this.playing = true;
  }

  pause() {
    this.assertActive();

    if (!this.playing) return;

    this.positionSeconds = this.getPosition();
    this.stopSources();
  }

  seek(seconds: number) {
    this.assertActive();

    const wasPlaying = this.playing;

    this.positionSeconds = Math.max(
      0,
      Math.min(this.durationSeconds, Number.isFinite(seconds) ? seconds : 0),
    );

    this.stopSources();

    if (wasPlaying && this.positionSeconds < this.durationSeconds) {
      void this.play();
    }
  }

  getPosition() {
    if (!this.playing) {
      return this.positionSeconds;
    }

    return Math.max(
      0,
      Math.min(this.durationSeconds, this.context.currentTime - this.startedAt),
    );
  }

  getDuration() {
    return this.durationSeconds;
  }

  isPlaying() {
    return this.playing && this.getPosition() < this.durationSeconds;
  }

  async dispose() {
    if (this.disposed) return;

    this.stopSources();
    this.buffers.clear();

    for (const gain of this.gains.values()) {
      gain.disconnect();
    }

    this.gains.clear();
    this.master.disconnect();
    this.limiter.disconnect();

    this.disposed = true;

    await this.context.close();
  }
}
