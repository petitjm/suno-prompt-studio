export const runtime = 'nodejs'

type RealRenderBlockedResponse = {
  ok: false
  status: 'blocked'
  audioStatus: 'not-generated'
  rendererStatus: 'not-connected'
  storageStatus: 'not-configured'
  formatStatus: 'not-selected'
  message: string
  blockedReasons: string[]
  requiredToUnlock: string[]
  receivedContractSummary: {
    hasRendererInputContract: boolean
    hasRealRenderGate: boolean
    hasFirstRealRenderPlan: boolean
    hasRealRenderConfiguration: boolean
    requestedTarget: string | null

    }
  receivedContractCheck: {
      passed: boolean
      missingOrInvalid: string[]
    }

  receivedConfigurationSummary: {
      configurationStatus: string | null
      audioStatus: string | null
      rendererStatus: string | null
      rendererCandidateStatus: string | null
      recommendedFirstRenderer: string | null
      rendererCandidateSelectedRenderer: string | null
      outputFormatStatus: string | null
      recommendedFirstFormat: string | null
      selectedFormat: string | null
      sampleRateStatus: string | null
      recommendedFirstSampleRateHz: number | null
      selectedSampleRateHz: number | null
      storageStatus: string | null
      firstTargetKey: string | null
    }
    receivedConfigurationCheck: {
      passed: boolean
      missingOrInvalid: string[]
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

export async function POST(req: Request) {
  let body: unknown = null

  try {
    body = await req.json()
  } catch {
    body = null
  }

  const bodyRecord = isRecord(body) ? body : null

  const rendererInputContract = bodyRecord?.rendererInputContract
  const realRenderGate = bodyRecord?.realRenderGate
  const firstRealRenderPlan = bodyRecord?.firstRealRenderPlan
  const realRenderConfiguration = bodyRecord?.realRenderConfiguration

  const requestedTarget =
    getString(bodyRecord?.requestedTarget) ||
    (isRecord(firstRealRenderPlan)
      ? getString(firstRealRenderPlan.recommendedFirstTarget)
      : null)

   const realRenderConfigurationRecord = getRecord(realRenderConfiguration)
   const rendererImplementation = getRecord(
      realRenderConfigurationRecord?.rendererImplementation,
   )
   const rendererCandidatePlan = getRecord(
      realRenderConfigurationRecord?.rendererCandidatePlan,
    )
   const outputFormat = getRecord(realRenderConfigurationRecord?.outputFormat)
   const sampleRate = getRecord(realRenderConfigurationRecord?.sampleRate)
   const storage = getRecord(realRenderConfigurationRecord?.storage)
   const firstTarget = getRecord(realRenderConfigurationRecord?.firstTarget)
   const missingOrInvalidContractFields: string[] = []

if (!isRecord(rendererInputContract)) {
  missingOrInvalidContractFields.push('rendererInputContract')
}

if (!isRecord(realRenderGate)) {
  missingOrInvalidContractFields.push('realRenderGate')
}

if (!isRecord(firstRealRenderPlan)) {
  missingOrInvalidContractFields.push('firstRealRenderPlan')
}

if (!isRecord(realRenderConfiguration)) {
  missingOrInvalidContractFields.push('realRenderConfiguration')
}

if (requestedTarget !== 'clickTrack') {
  missingOrInvalidContractFields.push('requestedTarget')
}
   const missingOrInvalidConfigurationFields: string[] = []

if (!realRenderConfigurationRecord) {
  missingOrInvalidConfigurationFields.push('realRenderConfiguration')
}

if (
  getString(realRenderConfigurationRecord?.configurationStatus) !==
  'dry-run-real-render-configuration-placeholder'
) {
  missingOrInvalidConfigurationFields.push('configurationStatus')
}

if (getString(realRenderConfigurationRecord?.audioStatus) !== 'not-generated') {
  missingOrInvalidConfigurationFields.push('audioStatus')
}

if (getString(rendererImplementation?.status) !== 'not-connected') {
  missingOrInvalidConfigurationFields.push('rendererImplementation.status')
}

if (
  getString(rendererCandidatePlan?.status) !==
  'candidate-declared-not-selected'
) {
  missingOrInvalidConfigurationFields.push('rendererCandidatePlan.status')
}

if (
  getString(rendererCandidatePlan?.recommendedFirstRenderer) !==
  'local-click-track-wav-renderer'
) {
  missingOrInvalidConfigurationFields.push(
    'rendererCandidatePlan.recommendedFirstRenderer',
  )
}

if (rendererCandidatePlan?.selectedRenderer !== null) {
  missingOrInvalidConfigurationFields.push(
    'rendererCandidatePlan.selectedRenderer',
  )
}

if (
  getString(outputFormat?.status) !==
  'format-candidate-declared-not-selected'
) {
  missingOrInvalidConfigurationFields.push('outputFormat.status')
}

if (getString(outputFormat?.recommendedFirstFormat) !== 'wav') {
  missingOrInvalidConfigurationFields.push(
    'outputFormat.recommendedFirstFormat',
  )
}

if (outputFormat?.selectedFormat !== null) {
  missingOrInvalidConfigurationFields.push('outputFormat.selectedFormat')
}

if (
  getString(sampleRate?.status) !==
  'sample-rate-candidate-declared-not-selected'
) {
  missingOrInvalidConfigurationFields.push('sampleRate.status')
}
if (sampleRate?.recommendedFirstSampleRateHz !== 44100) {
  missingOrInvalidConfigurationFields.push(
    'sampleRate.recommendedFirstSampleRateHz',
  )
}

if (sampleRate?.selectedSampleRateHz !== null) {
  missingOrInvalidConfigurationFields.push('sampleRate.selectedSampleRateHz')
}

if (getString(storage?.status) !== 'not-configured') {
  missingOrInvalidConfigurationFields.push('storage.status')
}

if (getString(firstTarget?.key) !== 'clickTrack') {
  missingOrInvalidConfigurationFields.push('firstTarget.key')
}

  const response: RealRenderBlockedResponse = {
    ok: false,
    status: 'blocked',
    audioStatus: 'not-generated',
    rendererStatus: 'not-connected',
    storageStatus: 'not-configured',
    formatStatus: 'not-selected',
    message:
      'Real audio rendering is blocked. This endpoint is a safe scaffold and does not generate audio files.',
    blockedReasons: [
      'Real audio renderer is not connected.',
      'Audio output format has not been selected.',
      'Generated audio storage has not been configured.',
      'Real render execution implementation has not been enabled.',
    ],
    requiredToUnlock: [
      'Connect a real renderer implementation.',
      'Choose an audio output format.',
      'Configure generated audio storage.',
      'Replace this blocked scaffold with real render execution.',
      'Write and store an audio file before marking any output generated.',
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
      typeof sampleRate?.recommendedFirstSampleRateHz === 'number'
        ? sampleRate.recommendedFirstSampleRateHz
        : null,
        selectedSampleRateHz:
          typeof sampleRate?.selectedSampleRateHz === 'number'
            ? sampleRate.selectedSampleRateHz
            : null,
              storageStatus: getString(storage?.status),
              firstTargetKey: getString(firstTarget?.key),
            },
            receivedConfigurationCheck: {
              passed: missingOrInvalidConfigurationFields.length === 0,
              missingOrInvalid: missingOrInvalidConfigurationFields,
            },
          }

  return Response.json(response, { status: 423 })
}