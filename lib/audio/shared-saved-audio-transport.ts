export type SavedAudioTransportSnapshot = {
  sourceUrl: string;
  currentTime: number;
  duration: number;
  playing: boolean;
  ready: boolean;
  ended: boolean;
};

export class SharedSavedAudioTransport {
  private element: HTMLAudioElement | null = null;

  private listeners = new Set<
    (snapshot: SavedAudioTransportSnapshot) => void
  >();

  private snapshot: SavedAudioTransportSnapshot = {
    sourceUrl: "",
    currentTime: 0,
    duration: 0,
    playing: false,
    ready: false,
    ended: false,
  };

  private readonly handleMediaEvent = () => {
    this.updateSnapshot();
  };

  attach(element: HTMLAudioElement) {
    if (this.element === element) {
      return;
    }

    this.detach();

    this.element = element;

    const events = [
      "loadedmetadata",
      "durationchange",
      "timeupdate",
      "play",
      "pause",
      "ended",
      "seeked",
      "emptied",
    ];

    for (const event of events) {
      element.addEventListener(event, this.handleMediaEvent);
    }

    this.updateSnapshot();
  }

  detach() {
    if (!this.element) {
      return;
    }

    const events = [
      "loadedmetadata",
      "durationchange",
      "timeupdate",
      "play",
      "pause",
      "ended",
      "seeked",
      "emptied",
    ];

    for (const event of events) {
      this.element.removeEventListener(event, this.handleMediaEvent);
    }

    this.element = null;
    this.updateSnapshot();
  }

  subscribe(listener: (snapshot: SavedAudioTransportSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot() {
    return this.snapshot;
  }

  refresh() {
  this.updateSnapshot();
}

  async play() {
    if (!this.element) {
      return false;
    }

    await this.element.play();
    return true;
  }

  pause() {
    this.element?.pause();
  }

  seek(seconds: number) {
    if (!this.element || !Number.isFinite(seconds)) {
      return;
    }

    const duration = this.element.duration;
    const safeSeconds = Math.max(
      0,
      Number.isFinite(duration) ? Math.min(seconds, duration) : seconds,
    );

    this.element.currentTime = safeSeconds;
    this.updateSnapshot();
  }

  stop() {
    this.pause();
    this.seek(0);
  }

  private updateSnapshot() {
    const element = this.element;

    const duration =
      element && Number.isFinite(element.duration) && element.duration > 0
        ? element.duration
        : 0;

    this.snapshot = {
      sourceUrl: element?.currentSrc || element?.src || "",
      currentTime: element?.currentTime || 0,
      duration,
      playing: element ? !element.paused : false,
      ready: element ? element.readyState >= 1 : false,
      ended: element?.ended || false,
    };

    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}
