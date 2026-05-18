type ReadJsonSafe = (response: Response) => Promise<any>

type LoadProjectVersionsResult = {
  songData: any
  chordData: any
}

export async function loadProjectVersions(
  projectId: string,
  readJsonSafe: ReadJsonSafe
): Promise<LoadProjectVersionsResult> {
  const [songRes, chordRes] = await Promise.all([
    fetch(`/api/song-versions/${projectId}`),
    fetch(`/api/chord-versions/${projectId}`),
  ])

  const songData = await readJsonSafe(songRes)
  const chordData = await readJsonSafe(chordRes)

  if (!songRes.ok) {
    throw new Error(songData.error || 'Failed to load song versions')
  }

  if (!chordRes.ok) {
    throw new Error(chordData.error || 'Failed to load chord versions')
  }

  return {
    songData,
    chordData,
  }
}