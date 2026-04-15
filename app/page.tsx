const handleGenerate = async () => {
  try {
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Generation failed')
    }

    setResult(data)

    if (activeProject) {
      const saveRes = await fetch('/api/song-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProject.id,
          title: form.theme || form.hook || 'Untitled Version',
          form,
          result: data,
        }),
      })

      const saveData = await saveRes.json()

      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Song generated but failed to save')
      }

      await loadProjectData(activeProject.id)
      setProjectMessage(`Song saved to project: ${activeProject.title}`)
    } else {
      setProjectMessage('Song generated, but no active project is selected.')
    }
  } catch (err: any) {
    console.error(err)
    setResult({ error: err.message || 'Generation failed' })
  } finally {
    setLoading(false)
  }
}