import { buildChordMarkersFromCueSheetSections } from "@/lib/audio/build-chord-markers";

import {
  createReadyClickTrackWavDownload,
  renderClickTrackWav,
} from "@/lib/audio/render-click-track-wav";

export const runtime = "nodejs";

type RealRenderBlockedResponse = {
  ok: false;
  status: "blocked";
  clickTrackRendererResult: ReturnType<typeof renderClickTrackWav>;
  audioStatus: "not-generated";
  rendererStatus: "not-connected";
  storageStatus: "not-configured";
  formatStatus: "not-selected";
  message: string;
  blockedReasons: string[];
  requiredToUnlock: string[];
  receivedContractSummary: {
    hasRendererInputContract: boolean;
    hasRealRenderGate: boolean;
    hasFirstRealRenderPlan: boolean;
    hasRealRenderConfiguration: boolean;
    requestedTarget: string | null;
  };
  receivedContractCheck: {
    passed: boolean;
    missingOrInvalid: string[];
  };
  receivedConfigurationSummary: {
    configurationStatus: string | null;
    audioStatus: string | null;
    rendererStatus: string | null;
    rendererCandidateStatus: string | null;
    recommendedFirstRenderer: string | null;
    rendererCandidateSelectedRenderer: string | null;
    outputFormatStatus: string | null;
    recommendedFirstFormat: string | null;
    selectedFormat: string | null;
    sampleRateStatus: string | null;
    recommendedFirstSampleRateHz: number | null;
    selectedSampleRateHz: number | null;
    storageStatus: string | null;
    recommendedFirstProvider: string | null;
    selectedProvider: string | null;
    firstTargetKey: string | null;
  };
  receivedConfigurationCheck: {
    passed: boolean;
    missingOrInvalid: string[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getCueSheetSections(value: unknown) {
  return getArray(value)
    .map((section) => {
      const record = getRecord(section);

      if (!record) {
        return null;
      }

      const order = getNumber(record.order);
      const sectionName = getString(record.section);
      const estimatedBars = getNumber(record.estimatedBars);
      const estimatedSeconds = getNumber(record.estimatedSeconds);
      const startSeconds = getNumber(record.startSeconds);
      const endSeconds = getNumber(record.endSeconds);
      const lyricLineCount = getNumber(record.lyricLineCount);

      if (
        order === null ||
        !sectionName ||
        estimatedBars === null ||
        estimatedSeconds === null ||
        startSeconds === null ||
        endSeconds === null
      ) {
        return null;
      }

      return {
        order,
        section: sectionName,
        estimatedBars,
        estimatedSeconds,
        startSeconds,
        endSeconds,
        lyricLineCount,
        chordPlacements: getArray(record.chordPlacements),
      };
    })
    .filter((section) => section !== null);
}

function getMelodyNotes(value: unknown) {
  return getArray(value)
    .map((note) => {
      const record = getRecord(note);

      if (!record) {
        return null;
      }

      const pitchMidi = getNumber(record.pitchMidi);
      const startSeconds = getNumber(record.startSeconds);
      const durationSeconds = getNumber(record.durationSeconds);
      const lyricText = getString(record.lyricText);

      if (
        pitchMidi === null ||
        startSeconds === null ||
        durationSeconds === null ||
        durationSeconds <= 0
      ) {
        return null;
      }

      return {
        pitchMidi,
        startSeconds,
        durationSeconds,
        lyricText: lyricText || undefined,
      };
    })
    .filter(
      (
        note,
      ): note is {
        pitchMidi: number;
        startSeconds: number;
        durationSeconds: number;
        lyricText: string | undefined;
      } => note !== null,
    );
}

function getTimelineSections(value: unknown) {
  return getArray(value)
    .map((section) => {
      const record = getRecord(section);

      if (!record) {
        return null;
      }

      const order = getNumber(record.order);
      const sectionName = getString(record.section);
      const chordPlacementCount = getNumber(record.chordPlacementCount);

      if (order === null || !sectionName || chordPlacementCount === null) {
        return null;
      }

      return {
        order,
        section: sectionName,
        chordPlacementCount,
      };
    })
    .filter((section) => section !== null);
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export async function POST(req: Request) {
  let body: unknown = null;

  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const bodyRecord = isRecord(body) ? body : null;

  const rendererInputContract = bodyRecord?.rendererInputContract;
  const realRenderGate = bodyRecord?.realRenderGate;
  const firstRealRenderPlan = bodyRecord?.firstRealRenderPlan;
  const realRenderConfiguration = bodyRecord?.realRenderConfiguration;
  const includeCountIn = bodyRecord?.includeCountIn !== false;
  const includeBeatClicks = bodyRecord?.includeBeatClicks !== false;
  const includeSectionMarkers = bodyRecord?.includeSectionMarkers !== false;
  const includeChordMarkers = bodyRecord?.includeChordMarkers !== false;
  const includeChordToneGuide = bodyRecord?.includeChordToneGuide !== false;
  const requestedMixProfile = getString(bodyRecord?.mixProfile);
  const mixProfile: "click-track" | "musical-guide" =
    requestedMixProfile === "musical-guide" ? "musical-guide" : "click-track";
  const requestedMusicalGuideMixLevels = getRecord(
    bodyRecord?.musicalGuideMixLevels,
  );

  const musicalGuideMixLevels = {
    click: getNumber(requestedMusicalGuideMixLevels?.click) ?? 0.5,
    section: getNumber(requestedMusicalGuideMixLevels?.section) ?? 0.6,
    chordMarker: getNumber(requestedMusicalGuideMixLevels?.chordMarker) ?? 0.7,
    pad: getNumber(requestedMusicalGuideMixLevels?.pad) ?? 0.75,
    arpeggio: getNumber(requestedMusicalGuideMixLevels?.arpeggio) ?? 0.35,
    bass: getNumber(requestedMusicalGuideMixLevels?.bass) ?? 0.75,
    melody: getNumber(requestedMusicalGuideMixLevels?.melody) ?? 1.7,
  };
  const requestedRenderJobId = getString(bodyRecord?.renderJobId);
  const dryRunRenderPlan = getRecord(bodyRecord?.dryRunRenderPlan);
  const dryRunCueSheet = getRecord(dryRunRenderPlan?.cueSheet);
  const cueSheetSections = getCueSheetSections(dryRunCueSheet?.sections);
  const chordMarkers = buildChordMarkersFromCueSheetSections(cueSheetSections);
  const melodyNotes = getMelodyNotes(bodyRecord?.melodyNotes);

  const requestedTarget =
    getString(bodyRecord?.requestedTarget) ||
    (isRecord(firstRealRenderPlan)
      ? getString(firstRealRenderPlan.recommendedFirstTarget)
      : null);

  const realRenderConfigurationRecord = getRecord(realRenderConfiguration);
  const rendererImplementation = getRecord(
    realRenderConfigurationRecord?.rendererImplementation,
  );
  const rendererCandidatePlan = getRecord(
    realRenderConfigurationRecord?.rendererCandidatePlan,
  );
  const outputFormat = getRecord(realRenderConfigurationRecord?.outputFormat);
  const sampleRate = getRecord(realRenderConfigurationRecord?.sampleRate);
  const storage = getRecord(realRenderConfigurationRecord?.storage);
  const firstTarget = getRecord(realRenderConfigurationRecord?.firstTarget);

  const missingOrInvalidContractFields: string[] = [];

  if (!isRecord(rendererInputContract)) {
    missingOrInvalidContractFields.push("rendererInputContract");
  }

  if (!isRecord(realRenderGate)) {
    missingOrInvalidContractFields.push("realRenderGate");
  }

  if (!isRecord(firstRealRenderPlan)) {
    missingOrInvalidContractFields.push("firstRealRenderPlan");
  }

  if (!isRecord(realRenderConfiguration)) {
    missingOrInvalidContractFields.push("realRenderConfiguration");
  }

  if (requestedTarget !== "clickTrack") {
    missingOrInvalidContractFields.push("requestedTarget");
  }

  const missingOrInvalidConfigurationFields: string[] = [];

  if (!realRenderConfigurationRecord) {
    missingOrInvalidConfigurationFields.push("realRenderConfiguration");
  }

  if (
    getString(realRenderConfigurationRecord?.configurationStatus) !==
    "dry-run-real-render-configuration-placeholder"
  ) {
    missingOrInvalidConfigurationFields.push("configurationStatus");
  }

  if (
    getString(realRenderConfigurationRecord?.audioStatus) !== "not-generated"
  ) {
    missingOrInvalidConfigurationFields.push("audioStatus");
  }

  if (getString(rendererImplementation?.status) !== "not-connected") {
    missingOrInvalidConfigurationFields.push("rendererImplementation.status");
  }

  if (
    getString(rendererCandidatePlan?.status) !==
    "candidate-declared-not-selected"
  ) {
    missingOrInvalidConfigurationFields.push("rendererCandidatePlan.status");
  }

  if (
    getString(rendererCandidatePlan?.recommendedFirstRenderer) !==
    "local-click-track-wav-renderer"
  ) {
    missingOrInvalidConfigurationFields.push(
      "rendererCandidatePlan.recommendedFirstRenderer",
    );
  }

  if (rendererCandidatePlan?.selectedRenderer !== null) {
    missingOrInvalidConfigurationFields.push(
      "rendererCandidatePlan.selectedRenderer",
    );
  }

  if (
    getString(outputFormat?.status) !== "format-candidate-declared-not-selected"
  ) {
    missingOrInvalidConfigurationFields.push("outputFormat.status");
  }

  if (getString(outputFormat?.recommendedFirstFormat) !== "wav") {
    missingOrInvalidConfigurationFields.push(
      "outputFormat.recommendedFirstFormat",
    );
  }

  if (outputFormat?.selectedFormat !== null) {
    missingOrInvalidConfigurationFields.push("outputFormat.selectedFormat");
  }

  if (
    getString(sampleRate?.status) !==
    "sample-rate-candidate-declared-not-selected"
  ) {
    missingOrInvalidConfigurationFields.push("sampleRate.status");
  }

  if (sampleRate?.recommendedFirstSampleRateHz !== 44100) {
    missingOrInvalidConfigurationFields.push(
      "sampleRate.recommendedFirstSampleRateHz",
    );
  }

  if (sampleRate?.selectedSampleRateHz !== null) {
    missingOrInvalidConfigurationFields.push("sampleRate.selectedSampleRateHz");
  }

  if (
    getString(storage?.status) !== "storage-candidate-declared-not-configured"
  ) {
    missingOrInvalidConfigurationFields.push("storage.status");
  }

  if (getString(storage?.recommendedFirstProvider) !== "browser-download") {
    missingOrInvalidConfigurationFields.push(
      "storage.recommendedFirstProvider",
    );
  }

  if (storage?.selectedProvider !== null) {
    missingOrInvalidConfigurationFields.push("storage.selectedProvider");
  }

  if (getString(firstTarget?.key) !== "clickTrack") {
    missingOrInvalidConfigurationFields.push("firstTarget.key");
  }

  const requestBody =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const clickTrackRenderInput = {
    totalBars: getNumber(dryRunCueSheet?.totalEstimatedBars) || undefined,
    totalEstimatedSeconds:
      getNumber(dryRunCueSheet?.totalEstimatedSeconds) || undefined,
    cueSheetSectionCount:
      getArray(dryRunCueSheet?.sections).length || undefined,
    cueSheetSections,
    chordMarkers,
    melodyNotes,
    includeCountIn,
    includeBeatClicks,
    includeSectionMarkers,
    includeChordMarkers,
    includeChordToneGuide,
    mixProfile,
    musicalGuideMixLevels,
    renderJobId:
      typeof requestBody.renderJobId === "string" &&
      requestBody.renderJobId.trim()
        ? requestBody.renderJobId
        : "blocked-real-render-route-test",
    targetKey: "clickTrack" as const,
    tempoBpm:
      typeof requestBody.tempoBpm === "number" &&
      Number.isFinite(requestBody.tempoBpm)
        ? requestBody.tempoBpm
        : 80,
    sampleRateHz: 44100 as const,
    outputFormat: "wav" as const,
    storageProvider: "browser-download" as const,
    countInBars: 1,
    totalDurationSeconds: 10,
  };

  const clickTrackRendererResult = renderClickTrackWav(clickTrackRenderInput);

  const realDownloadRequested =
    requestBody.enableRealClickTrackWavDownload === true;

  if (
    realDownloadRequested &&
    missingOrInvalidContractFields.length === 0 &&
    missingOrInvalidConfigurationFields.length === 0
  ) {
    const readyDownload = createReadyClickTrackWavDownload(
      clickTrackRenderInput,
    );
    const downloadArtifact = readyDownload.downloadArtifact;
    const wavBody = new Uint8Array(downloadArtifact.bytes).buffer;

    return new Response(wavBody, {
      status: 200,
      headers: {
        "Content-Type": downloadArtifact.contentType,
        "Content-Length": String(downloadArtifact.byteLength),
        "Content-Disposition": `attachment; filename="${downloadArtifact.filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Audio-Generated": "true",
        "X-Audio-Delivered": "true",
        "X-Renderer-Status": readyDownload.status,
        "X-Renderer-Name": "local-click-track-wav-renderer",
        "X-Renderer-Target": "clickTrack",
        "X-Renderer-Gate": "enableRealClickTrackWavDownload",
        "X-Renderer-Tempo-BPM": String(clickTrackRenderInput.tempoBpm),
        "X-Renderer-Sample-Rate": String(clickTrackRenderInput.sampleRateHz),
        "X-Renderer-Job-ID": clickTrackRenderInput.renderJobId,
        "X-Renderer-Mix-Profile":
          clickTrackRenderInput.mixProfile || "click-track",
      },
    });
  }

  const response: RealRenderBlockedResponse = {
    ok: false,
    status: "blocked",
    clickTrackRendererResult,
    audioStatus: "not-generated",
    rendererStatus: "not-connected",
    storageStatus: "not-configured",
    formatStatus: "not-selected",
    message:
      "Real audio rendering is blocked. This endpoint is a safe scaffold and does not generate audio files.",
    blockedReasons: [
      "Real audio renderer is not connected.",
      "Audio output format has not been selected.",
      "Generated audio storage has not been configured.",
      "Real render execution implementation has not been enabled.",
    ],
    requiredToUnlock: [
      "Connect a real renderer implementation.",
      "Choose an audio output format.",
      "Configure generated audio storage.",
      "Replace this blocked scaffold with real render execution.",
      "Write and store an audio file before marking any output generated.",
    ],
    receivedContractSummary: {
      hasRendererInputContract: isRecord(rendererInputContract),
      hasRealRenderGate: isRecord(realRenderGate),
      hasFirstRealRenderPlan: isRecord(firstRealRenderPlan),
      hasRealRenderConfiguration: isRecord(realRenderConfiguration),
      requestedTarget,
    },
    receivedContractCheck: {
      passed: missingOrInvalidContractFields.length === 0,
      missingOrInvalid: missingOrInvalidContractFields,
    },
    receivedConfigurationSummary: {
      configurationStatus: getString(
        realRenderConfigurationRecord?.configurationStatus,
      ),
      audioStatus: getString(realRenderConfigurationRecord?.audioStatus),
      rendererStatus: getString(rendererImplementation?.status),
      rendererCandidateStatus: getString(rendererCandidatePlan?.status),
      recommendedFirstRenderer: getString(
        rendererCandidatePlan?.recommendedFirstRenderer,
      ),
      rendererCandidateSelectedRenderer: getString(
        rendererCandidatePlan?.selectedRenderer,
      ),
      outputFormatStatus: getString(outputFormat?.status),
      recommendedFirstFormat: getString(outputFormat?.recommendedFirstFormat),
      selectedFormat: getString(outputFormat?.selectedFormat),
      sampleRateStatus: getString(sampleRate?.status),
      recommendedFirstSampleRateHz:
        typeof sampleRate?.recommendedFirstSampleRateHz === "number"
          ? sampleRate.recommendedFirstSampleRateHz
          : null,
      selectedSampleRateHz:
        typeof sampleRate?.selectedSampleRateHz === "number"
          ? sampleRate.selectedSampleRateHz
          : null,
      storageStatus: getString(storage?.status),
      recommendedFirstProvider: getString(storage?.recommendedFirstProvider),
      selectedProvider: getString(storage?.selectedProvider),
      firstTargetKey: getString(firstTarget?.key),
    },
    receivedConfigurationCheck: {
      passed: missingOrInvalidConfigurationFields.length === 0,
      missingOrInvalid: missingOrInvalidConfigurationFields,
    },
  };

  return Response.json(response, { status: 423 });
}
