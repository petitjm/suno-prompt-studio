import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const sourcePath = "lib/audio/shared-saved-audio-transport.ts";

async function loadTransport() {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "saved-audio-transport-"),
  );

  const source = await fs.readFile(sourcePath, "utf8");

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const modulePath = path.join(directory, "transport.mjs");
  await fs.writeFile(modulePath, compiled);

  try {
    const module = await import(pathToFileURL(modulePath).href);
    return module.SharedSavedAudioTransport;
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

class MockAudioElement {
  constructor() {
    this.src = "https://example.test/audio.mp3";
    this.currentSrc = this.src;
    this.currentTime = 0;
    this.duration = 120;
    this.paused = true;
    this.ended = false;
    this.readyState = 1;

    this.listeners = new Map();
    this.playCalls = 0;
    this.pauseCalls = 0;
  }

  addEventListener(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(listener);
  }

  removeEventListener(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }

  dispatch(event) {
    for (const listener of this.listeners.get(event) || []) {
      listener();
    }
  }

  async play() {
    this.playCalls += 1;
    this.paused = false;
    this.ended = false;
    this.dispatch("play");
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
    this.dispatch("pause");
  }

  listenerCount(event) {
    return this.listeners.get(event)?.size || 0;
  }
}

test("attaches to the existing audio element", async () => {
  const Transport = await loadTransport();
  const transport = new Transport();
  const audio = new MockAudioElement();

  transport.attach(audio);

  const snapshot = transport.getSnapshot();

  assert.equal(snapshot.sourceUrl, audio.src);
  assert.equal(snapshot.duration, 120);
  assert.equal(snapshot.currentTime, 0);
  assert.equal(snapshot.ready, true);
  assert.equal(snapshot.playing, false);
});

test("plays and pauses the attached audio element", async () => {
  const Transport = await loadTransport();
  const transport = new Transport();
  const audio = new MockAudioElement();

  transport.attach(audio);

  assert.equal(await transport.play(), true);
  assert.equal(audio.playCalls, 1);
  assert.equal(transport.getSnapshot().playing, true);

  transport.pause();

  assert.equal(audio.pauseCalls, 1);
  assert.equal(transport.getSnapshot().playing, false);
});

test("seeking respects the audio duration", async () => {
  const Transport = await loadTransport();
  const transport = new Transport();
  const audio = new MockAudioElement();

  transport.attach(audio);

  transport.seek(45);
  assert.equal(audio.currentTime, 45);

  transport.seek(200);
  assert.equal(audio.currentTime, 120);

  transport.seek(-10);
  assert.equal(audio.currentTime, 0);

  transport.seek(Number.NaN);
  assert.equal(audio.currentTime, 0);
});

test("stop pauses playback and returns to the beginning", async () => {
  const Transport = await loadTransport();
  const transport = new Transport();
  const audio = new MockAudioElement();

  transport.attach(audio);
  await transport.play();

  transport.seek(40);
  transport.stop();

  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
  assert.equal(transport.getSnapshot().playing, false);
});

test("subscribers receive playback updates", async () => {
  const Transport = await loadTransport();
  const transport = new Transport();
  const audio = new MockAudioElement();

  const snapshots = [];

  const unsubscribe = transport.subscribe((snapshot) => {
    snapshots.push(snapshot);
  });

  transport.attach(audio);

  audio.currentTime = 25;
  audio.dispatch("timeupdate");

  assert.equal(snapshots.at(-1).currentTime, 25);

  const countBeforeUnsubscribe = snapshots.length;

  unsubscribe();

  audio.currentTime = 50;
  audio.dispatch("timeupdate");

  assert.equal(snapshots.length, countBeforeUnsubscribe);
});

test("reattaching the same element does not duplicate listeners", async () => {
  const Transport = await loadTransport();
  const transport = new Transport();
  const audio = new MockAudioElement();

  transport.attach(audio);
  transport.attach(audio);
  transport.attach(audio);

  assert.equal(audio.listenerCount("timeupdate"), 1);
  assert.equal(audio.listenerCount("play"), 1);
});

test("detaching removes listeners and clears transport state", async () => {
  const Transport = await loadTransport();
  const transport = new Transport();
  const audio = new MockAudioElement();

  transport.attach(audio);
  transport.detach();

  assert.equal(audio.listenerCount("timeupdate"), 0);
  assert.equal(audio.listenerCount("play"), 0);

  assert.equal(transport.getSnapshot().sourceUrl, "");
  assert.equal(transport.getSnapshot().ready, false);
});

test("cannot play when no audio element is attached", async () => {
  const Transport = await loadTransport();
  const transport = new Transport();

  assert.equal(await transport.play(), false);

  transport.pause();
  transport.seek(10);
  transport.stop();

  assert.equal(transport.getSnapshot().playing, false);
});
