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
  receivedConfigurationSummary: {
      configurationStatus: string | null
      audioStatus: string | null
      rendererStatus: string | null
      outputFormatStatus: string | null
      sampleRateStatus: string | null
      storageStatus: string | null
      firstTargetKey: string | null
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
   const outputFormat = getRecord(realRenderConfigurationRecord?.outputFormat)
   const sampleRate = getRecord(realRenderConfigurationRecord?.sampleRate)
   const storage = getRecord(realRenderConfigurationRecord?.storage)
   const firstTarget = getRecord(realRenderConfigurationRecord?.firstTarget)

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
    receivedConfigurationSummary: {
      configurationStatus: getString(
        realRenderConfigurationRecord?.configurationStatus,
      ),
      audioStatus: getString(realRenderConfigurationRecord?.audioStatus),
      rendererStatus: getString(rendererImplementation?.status),
      outputFormatStatus: getString(outputFormat?.status),
      sampleRateStatus: getString(sampleRate?.status),
      storageStatus: getString(storage?.status),
      firstTargetKey: getString(firstTarget?.key),
    },
  }

  return Response.json(response, { status: 423 })
}