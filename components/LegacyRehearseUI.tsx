'use client'

import React from 'react'

export default function LegacyRehearseUI() {
  return <div>Legacy rehearse UI placeholder</div>
}
  return (
    <div style={pageStyle}>
      <div style={sidebarStyle}>
        <h3 style={{ marginTop: 0 }}>Projects</h3>

        {authLoading ? (
          <div style={{ color: '#a1a1aa', fontSize: 14 }}>Checking sign-in status...</div>
        ) : !user ? (
          <div style={{ color: '#a1a1aa', fontSize: 14 }}>Sign in to create and manage projects.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                placeholder="New project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{ ...inputStyle, padding: '10px 12px', flex: 1 }}
              />
              <button onClick={createProject} style={primaryButtonStyle}>
                +
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <button
                onClick={renameProject}
                disabled={renameProjectLoading || !activeProject}
                style={secondaryButtonStyle}
              >
                {renameProjectLoading ? 'Renaming...' : 'Rename'}
              </button>
              <button
                onClick={duplicateProject}
                disabled={duplicateProjectLoading || !activeProject}
                style={secondaryButtonStyle}
              >
                {duplicateProjectLoading ? 'Duplicating...' : 'Duplicate'}
              </button>
              <button
                onClick={deleteProject}
                disabled={deleteProjectLoading || !activeProject}
                style={dangerButtonStyle}
              >
                {deleteProjectLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>

            {projectMessage && (
              <div style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 10 }}>{projectMessage}</div>
            )}

            <div style={tableWrapStyle}>
              <div style={projectTableScrollStyle}>
                <table style={projectTableStyle}>
                  <thead>
                    <tr>
                      <th
                        style={{ ...projectThStyle, ...frozenProjectHeaderStyle, width: 300 }}
                        onClick={() => toggleProjectSort('title')}
                      >
                        Project {projectSortKey === 'title' ? (projectSortDirection === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        style={{ ...projectThStyle, width: 260 }}
                        onClick={() => toggleProjectSort('updated_at')}
                      >
                        Last updated{' '}
                        {projectSortKey === 'updated_at' ? (projectSortDirection === 'asc' ? '▲' : '▼') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.length > 0 ? (
                      sortedProjects.map((p) => {
                        const isActive = activeProject?.id === p.id

                        return (
                          <tr
                            key={p.id}
                            style={{
                              background: isActive ? '#2563eb33' : 'transparent',
                            }}
                          >
                            <td
                              style={{
                                ...projectTdStyle,
                                ...frozenProjectColumnStyle,
                                background: isActive ? '#1d4ed833' : '#1f1f23',
                                width: 300,
                              }}
                              title={p.title}
                            >
                              <button onClick={() => setActiveProject(p)} style={projectRowButtonStyle} title={p.title}>
                                {p.title}
                              </button>
                            </td>

                            <td style={{ ...projectTdStyle, width: 260 }}>
                              <button
                                onClick={() => setActiveProject(p)}
                                style={projectRowButtonStyle}
                                title={formatUkDateTime((p.updated_at || p.created_at) as string)}
                              >
                                {formatUkDateTime((p.updated_at || p.created_at) as string)}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={2} style={emptyHistoryStyle}>
                          No projects yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={mainStyle}>
        <h1 style={{ marginTop: 0 }}>Suno Prompt Studio</h1>

        {hasSavedArtistDNA && (
          <div
            style={{
              ...panelStyle,
              marginBottom: 24,
              border: '1px solid #2563eb',
              background: '#1d2a44',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Applied Artist DNA</div>
            <div style={{ color: '#dbeafe', marginBottom: 10 }}>
              Your saved Artist DNA is currently shaping song generation, rewrites, chord generation, and chord
              rewrites.
            </div>

            {artistDNA.dna_summary && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: '#162338',
                  border: '1px solid #3b82f6',
                }}
              >
                {artistDNA.dna_summary}
              </div>
            )}

            {appliedDNALines.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {appliedDNALines.map((line) => (
                  <div
                    key={line}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      background: '#162338',
                      border: '1px solid #3b82f6',
                      color: '#dbeafe',
                      fontSize: 14,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!user ? (
          <div style={{ ...panelStyle, marginBottom: 24 }}>
            <h2 style={{ marginTop: 0 }}>Sign in</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                placeholder="Email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
              <button onClick={sendCode} style={primaryButtonStyle}>
                Send Code
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Code"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
              <button onClick={verifyCode} style={secondaryButtonStyle}>
                Verify
              </button>
            </div>

            {authMessage && <div style={{ color: '#a1a1aa' }}>{authMessage}</div>}
          </div>
        ) : (
          <div style={{ ...panelStyle, marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}>
              Logged in as <strong>{user.email}</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              Active project: <strong>{activeProject ? activeProject.title : 'None selected'}</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              Artist DNA status: <strong>{hasSavedArtistDNA ? 'Applied to outputs' : 'No saved DNA yet'}</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              Auto-save:{' '}
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                {autoSave ? 'On' : 'Off'}
              </label>
            </div>
            {versionsLoading && <div style={{ color: '#a1a1aa', marginBottom: 12 }}>Loading project history...</div>}
            <button onClick={signOut} style={secondaryButtonStyle}>
              Sign out
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(360px, 1fr) minmax(360px, 1fr)',
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Song Builder</h2>

            {hasSavedArtistDNA && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 10,
                  borderRadius: 12,
                  background: '#1f1f23',
                  border: '1px solid #3f3f46',
                  color: '#d4d4d8',
                  fontSize: 14,
                }}
              >
                Using saved Artist DNA
                {artistDNA.artist_name ? ` for ${artistDNA.artist_name}` : ''}.
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Creative DNA</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {dnaOptions.map((dna) => (
                  <button
                    key={dna.id}
                    type="button"
                    onClick={() => setForm({ ...form, dnaId: dna.id })}
                    style={chipStyle(form.dnaId === dna.id)}
                  >
                    {dna.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Genre</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setForm({ ...form, genre })}
                    style={chipStyle(form.genre === genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Mood</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {moodOptions.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    style={chipStyle(form.moods.includes(mood))}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Theme</label>
              <textarea
                placeholder="What is this song about?"
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                style={textareaStyle}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Hook</label>
              <input
                placeholder="Hook phrase"
                value={form.hook}
                onChange={(e) => setForm({ ...form, hook: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h3 style={{ marginTop: 0 }}>Start New Project from Lyrics</h3>

              <div style={{ marginBottom: 12 }}>
                <label style={sectionTitleStyle}>New Project Title</label>
                <input
                  value={importLyricsTitle}
                  onChange={(e) => setImportLyricsTitle(e.target.value)}
                  style={inputStyle}
                  placeholder="Imported Lyrics"
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={sectionTitleStyle}>Paste Lyrics</label>
                <textarea
                  value={editableLyrics}
                  onChange={(e) => setEditableLyrics(e.target.value)}
                  style={{ ...textareaStyle, minHeight: 180 }}
                  placeholder="Paste your lyrics here..."
                />
              </div>

              <button onClick={handleImportLyrics} disabled={importLyricsLoading} style={secondaryButtonStyle}>
                {importLyricsLoading ? 'Creating Project...' : 'Create Project from Lyrics'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <button onClick={handleGenerate} disabled={loading} style={primaryButtonStyle}>
                {loading ? 'Generating...' : 'Generate Song'}
              </button>

              <button onClick={handleGenerateChords} disabled={chordLoading} style={secondaryButtonStyle}>
                {chordLoading ? 'Generating Chords...' : 'Generate Chords'}
              </button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={sectionTitleStyle}>Version Name</label>
              <input
                placeholder="e.g. Acoustic rewrite v2"
                value={manualVersionName}
                onChange={(e) => setManualVersionName(e.target.value)}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                <button onClick={handleManualSaveSong} disabled={manualSongSaveLoading} style={primaryButtonStyle}>
                  {manualSongSaveLoading ? 'Saving Song...' : 'Save Song As Version'}
                </button>

                <button onClick={handleManualSaveChords} disabled={manualChordSaveLoading} style={primaryButtonStyle}>
                  {manualChordSaveLoading ? 'Saving Chords...' : 'Save Chords As Version'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={sectionTitleStyle}>Song Sheet</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={handleCreateSongSheet} disabled={songSheetLoading} style={secondaryButtonStyle}>
                  {songSheetLoading ? 'Building...' : 'Create Song Sheet'}
                </button>
                <button onClick={exportSongSheetTxt} style={secondaryButtonStyle}>
                  Export Song Sheet TXT
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={sectionTitleStyle}>Export</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={exportSongTxt} style={secondaryButtonStyle}>
                  Export Song TXT
                </button>
                <button onClick={exportChordsTxt} style={secondaryButtonStyle}>
                  Export Chords TXT
                </button>
                <button onClick={exportCombinedTxt} style={secondaryButtonStyle}>
                  Export Combined TXT
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h3 style={{ marginTop: 0 }}>Rewrite Lab</h3>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {rewriteButtons.map((button) => (
                  <button
                    key={button.mode}
                    onClick={() => handleRewrite(button.mode, button.label)}
                    disabled={rewriteLoading !== null}
                    style={secondaryButtonStyle}
                  >
                    {rewriteLoading === button.mode ? 'Rewriting...' : button.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h3 style={{ marginTop: 0 }}>Song Version History</h3>

              <div style={tableWrapStyle}>
                <div style={tableScrollStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '48%', cursor: 'default' }}>Title</th>
                        <th style={{ ...thStyle, width: '36%', cursor: 'default' }}>Saved</th>
                        <th style={{ ...thStyle, width: '16%', cursor: 'default' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {songVersions.length > 0 ? (
                        songVersions.map((version) => (
                          <tr
                            key={version.id}
                            style={{
                              background: activeSongVersionId === version.id ? '#2563eb33' : 'transparent',
                            }}
                          >
                            <td style={tdStyle}>
                              <button onClick={() => loadSongVersion(version)} style={rowButtonStyle}>
                                {version.title ||
                                  version.result?.lyrics_brief ||
                                  version.form?.hook ||
                                  version.form?.theme ||
                                  'Untitled Version'}
                              </button>
                            </td>
                            <td style={tdStyle}>
                              <button onClick={() => loadSongVersion(version)} style={rowButtonStyle}>
                                {formatUkDateTime(version.created_at)}
                              </button>
                            </td>
                            <td style={tdStyle}>
                              <button onClick={() => deleteSongVersion(version.id)} style={actionIconButtonStyle}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={emptyHistoryStyle}>
                            No saved song versions yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Output</h2>

            {result ? (
              result.error ? (
                <div style={{ color: '#f87171', marginBottom: 20 }}>{result.error}</div>
              ) : (
                <>
                  {result.style_short && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Style (Short)</div>
                      <div>{result.style_short}</div>
                    </div>
                  )}

                  {result.style_detailed && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Style (Detailed)</div>
                      <div>{result.style_detailed}</div>
                    </div>
                  )}

                  {result.lyrics_brief && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Lyrics Brief</div>
                      <div>{result.lyrics_brief}</div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div style={{ color: '#a1a1aa', marginBottom: 20 }}>No song output yet</div>
            )}

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h2 style={{ marginTop: 0 }}>Lyrics Editor</h2>

              <textarea
                value={editableLyrics}
                onChange={(e) => setEditableLyrics(e.target.value)}
                style={{ ...textareaStyle, minHeight: 260 }}
                placeholder="Lyrics will appear here..."
              />

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  onClick={() => {
                    setResult((prev) =>
                      prev
                        ? {
                            ...prev,
                            lyrics_full: editableLyrics,
                          }
                        : {
                            lyrics_full: editableLyrics,
                          }
                    )
                    setSongSheet('')
                    setCurrentPreviewBarIndex(0)
                    stopPreviewPlayback()
                    resetPerformanceScroll()
                    setProjectMessage('Lyrics updated in working view.')
                  }}
                  style={secondaryButtonStyle}
                >
                  Apply Edits
                </button>

                <button onClick={handleSaveEditedLyrics} disabled={saveEditedLyricsLoading} style={primaryButtonStyle}>
                  {saveEditedLyricsLoading ? 'Saving Edited Lyrics...' : 'Save Edited Version'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h2 style={{ marginTop: 0 }}>Chord Engine</h2>

              {chords ? (
                chords.error ? (
                  <div style={{ color: '#f87171', marginBottom: 20 }}>{chords.error}</div>
                ) : (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <strong>Key:</strong> {transposedKey || chords.key || '—'}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <strong>Capo:</strong> {transposedCapoHint || chords.capo || '—'}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Verse</div>
                      <div>{transposeTextPreservingLayout(chords.verse || '—', transposeAmount)}</div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Chorus</div>
                      <div>{transposeTextPreservingLayout(chords.chorus || '—', transposeAmount)}</div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Bridge</div>
                      <div>{transposeTextPreservingLayout(chords.bridge || '—', transposeAmount)}</div>
                    </div>

                    {chords.notes && (
                      <div style={{ color: '#d4d4d8', fontStyle: 'italic', marginBottom: 20 }}>{chords.notes}</div>
                    )}
                  </>
                )
              ) : (
                <div style={{ color: '#a1a1aa', marginBottom: 20 }}>No chord output yet</div>
              )}

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
                <h2 style={{ marginTop: 0 }}>Song Sheet</h2>

                {transposedSongSheet ? (
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      fontFamily: 'Courier New, monospace',
                      lineHeight: 1.7,
                      background: '#18181b',
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid #3f3f46',
                    }}
                  >
                    {transposedSongSheet}
                  </pre>
                ) : (
                  <div style={{ color: '#a1a1aa' }}>No song sheet yet</div>
                )}
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
                <h3 style={{ marginTop: 0 }}>Chord Lab v2</h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {chordRewriteButtons.map((button) => (
                    <button
                      key={button.mode}
                      onClick={() => handleChordRewrite(button.mode)}
                      disabled={chordRewriteLoading !== null}
                      style={secondaryButtonStyle}
                    >
                      {chordRewriteLoading === button.mode ? 'Reworking...' : button.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
                <h3 style={{ marginTop: 0 }}>Chord History</h3>

                <div style={tableWrapStyle}>
                  <div style={tableScrollStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: '34%', cursor: 'default' }}>Title</th>
                          <th style={{ ...thStyle, width: '16%', cursor: 'default' }}>Key</th>
                          <th style={{ ...thStyle, width: '34%', cursor: 'default' }}>Saved</th>
                          <th style={{ ...thStyle, width: '16%', cursor: 'default' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chordVersions.length > 0 ? (
                          chordVersions.map((version) => (
                            <tr
                              key={version.id}
                              style={{
                                background: activeChordVersionId === version.id ? '#2563eb33' : 'transparent',
                              }}
                            >
                              <td style={tdStyle}>
                                <button onClick={() => loadChordVersion(version)} style={rowButtonStyle}>
                                  {version.title || 'Chord Snapshot'}
                                </button>
                              </td>
                              <td style={tdStyle}>
                                <button onClick={() => loadChordVersion(version)} style={rowButtonStyle}>
                                  {version.chord_data?.key || '—'}
                                </button>
                              </td>
                              <td style={tdStyle}>
                                <button onClick={() => loadChordVersion(version)} style={rowButtonStyle}>
                                  {formatUkDateTime(version.created_at)}
                                </button>
                              </td>
                              <td style={tdStyle}>
                                <button onClick={() => deleteChordVersion(version.id)} style={actionIconButtonStyle}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={emptyHistoryStyle}>
                              No saved chord versions yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...panelStyle, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Performance Mode</h2>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <button onClick={() => setPerformanceMode((prev) => !prev)} style={primaryButtonStyle}>
              {performanceMode ? 'Hide Performance Mode' : 'Show Performance Mode'}
            </button>

            <button onClick={() => setTransposeAmount((prev) => prev - 1)} style={secondaryButtonStyle}>
              Transpose -1
            </button>

            <button onClick={() => setTransposeAmount(0)} style={secondaryButtonStyle}>
              Reset Transpose
            </button>

            <button onClick={() => setTransposeAmount((prev) => prev + 1)} style={secondaryButtonStyle}>
              Transpose +1
            </button>
          </div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <strong>Transpose:</strong> {transposeAmount > 0 ? `+${transposeAmount}` : transposeAmount}
            </div>
            <div>
              <strong>Display Key:</strong> {transposedKey || chords?.key || '—'}
            </div>
            <div>
              <strong>Capo:</strong> {transposedCapoHint || chords?.capo || '—'}
            </div>
            {performanceMode && performanceSections.length > 0 && (
              <div>
                <strong>Current section:</strong>{' '}
                {activePerformanceSectionIndex >= 0
                  ? performanceSections[activePerformanceSectionIndex]?.label
                  : performanceSections[0]?.label}
              </div>
            )}
            {previewPlaying && (
              <div>
                <strong>Current bar:</strong> {currentPreviewBarIndex + 1} / {Math.max(1, previewBars.length)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={performanceShowChords}
                onChange={(e) => setPerformanceShowChords(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Show chords
            </label>

            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={followPlayback}
                onChange={(e) => setFollowPlayback(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Follow playback
            </label>

            <label style={{ cursor: 'pointer' }}>
              Font size
              <input
                type="range"
                min={20}
                max={44}
                value={performanceFontSize}
                onChange={(e) => setPerformanceFontSize(Number(e.target.value))}
                style={{ marginLeft: 10 }}
              />
              <span style={{ marginLeft: 8 }}>{performanceFontSize}px</span>
            </label>

            <label style={{ cursor: 'pointer' }}>
              Scroll rate
              <input
                type="range"
                min={1}
                max={12}
                value={playbackScrollRate}
                onChange={(e) => setPlaybackScrollRate(Number(e.target.value))}
                style={{ marginLeft: 10 }}
              />
              <span style={{ marginLeft: 8 }}>{playbackScrollRate}</span>
            </label>


            <label style={{ cursor: 'pointer' }}>
              Scroll speed
              <input
                type="range"
                min={1}
                max={10}
                value={performanceScrollSpeed}
                onChange={(e) => setPerformanceScrollSpeed(Number(e.target.value))}
                style={{ marginLeft: 10 }}
              />
              <span style={{ marginLeft: 8 }}>{performanceScrollSpeed}</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              onClick={() => setPerformanceIsScrolling(true)}
              style={secondaryButtonStyle}
              disabled={!performanceMode || !performanceSheet.trim() || (previewPlaying && followPlayback)}
            >
              Start Scroll
            </button>

            <button onClick={stopPerformanceScroll} style={secondaryButtonStyle} disabled={!performanceMode}>
              Pause Scroll
            </button>

            <button onClick={resetPerformanceScroll} style={secondaryButtonStyle} disabled={!performanceMode}>
              Reset Scroll
            </button>

            <button
              onClick={jumpToNextPerformanceSection}
              style={{
                ...primaryButtonStyle,
                opacity: !performanceMode || !nextPerformanceSection ? 0.55 : 1,
                cursor: !performanceMode || !nextPerformanceSection ? 'not-allowed' : 'pointer',
              }}
              disabled={!performanceMode || !nextPerformanceSection}
            >
              {nextPerformanceSection ? `Next Section: ${nextPerformanceSection.label}` : 'Next Section'}
            </button>
          </div>

          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 16,
              border: '1px solid #3f3f46',
              background: '#1b1b20',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Audio Preview</h3>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
              <label style={{ cursor: 'pointer' }}>
                Section
                <select
                  value={previewSection}
                  onChange={(e) => setPreviewSection(e.target.value as PreviewSectionKey)}
                  style={{ ...inputStyle, width: 170, marginLeft: 10, padding: '10px 12px' }}
                >
                  <option value="verse">Verse</option>
                  <option value="chorus">Chorus</option>
                  <option value="bridge">Bridge</option>
                  <option value="full_song">Full Song</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Pattern
                <select
                  value={previewPattern}
                  onChange={(e) => setPreviewPattern(e.target.value as PreviewPattern)}
                  style={{ ...inputStyle, width: 210, marginLeft: 10, padding: '10px 12px' }}
                >
                  <option value="ballad_strum">Ballad Strum</option>
                  <option value="country_train">Country Train</option>
                  <option value="fingerpick">Fingerpick</option>
                  <option value="piano_block">Piano Block Chords</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Instrument
                <select
                  value={previewInstrument}
                  onChange={(e) => setPreviewInstrument(e.target.value as PreviewInstrument)}
                  style={{ ...inputStyle, width: 170, marginLeft: 10, padding: '10px 12px' }}
                  disabled={previewPattern === 'piano_block'}
                >
                  <option value="guitar">Guitar</option>
                  <option value="piano">Piano</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Feel
                <select
                  value={previewFeel}
                  onChange={(e) => setPreviewFeel(e.target.value as PreviewFeel)}
                  style={{ ...inputStyle, width: 150, marginLeft: 10, padding: '10px 12px' }}
                  disabled={previewPattern === 'fingerpick' || previewPattern === 'piano_block'}
                >
                  <option value="straight">Straight</option>
                  <option value="swing">Swing</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <label style={{ cursor: 'pointer' }}>
                Tempo
                <input
                  type="range"
                  min={60}
                  max={150}
                  value={previewTempo}
                  onChange={(e) => setPreviewTempo(Number(e.target.value))}
                  style={{ marginLeft: 10 }}
                />
                <span style={{ marginLeft: 8 }}>{previewTempo} BPM</span>
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewLoop}
                  onChange={(e) => setPreviewLoop(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Loop
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewIncludeBass}
                  onChange={(e) => setPreviewIncludeBass(e.target.checked)}
                  style={{ marginRight: 8 }}
                  disabled={previewPattern === 'country_train'}
                />
                Add bass
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewIncludeClick}
                  onChange={(e) => setPreviewIncludeClick(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Add click
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                onClick={startPreviewPlayback}
                disabled={!previewBars.length}
                style={{
                  ...primaryButtonStyle,
                  opacity: previewBars.length ? 1 : 0.55,
                  cursor: previewBars.length ? 'pointer' : 'not-allowed',
                }}
              >
                {previewPlaying ? 'Restart Preview' : previewReady ? 'Play Preview' : 'Enable Audio + Play'}
              </button>

              <button
                onClick={stopPreviewPlayback}
                disabled={!previewPlaying}
                style={{
                  ...secondaryButtonStyle,
                  opacity: previewPlaying ? 1 : 0.55,
                  cursor: previewPlaying ? 'pointer' : 'not-allowed',
                }}
              >
                Stop Preview
              </button>
            </div>

            <div style={{ color: '#a1a1aa', fontSize: 13 }}>
              {previewBars.length > 0
                ? `${previewBars.length} preview bar${previewBars.length === 1 ? '' : 's'} ready`
                : 'Generate or load chords to enable preview'}
            </div>
          </div>

          {performanceMode ? (
            <>
              <SectionJumpButtons
                performanceSections={performanceSections}
                activePerformanceSectionId={activePerformanceSectionId}
                onJumpToSection={handlePerformanceSectionJump}
              />

              <div
                ref={performanceScrollRef}
                style={{
                  maxHeight: 620,
                  overflowY: 'auto',
                  borderRadius: 16,
                  border: '1px solid #3f3f46',
                  background: '#0b0b0d',
                  padding: 8,
                  scrollBehavior: 'smooth',
                }}
              >
                <SongSheet
                  performanceSheet={performanceSheet}
                  performanceSections={performanceSections}
                  performanceFontSize={performanceFontSize}
                  activePerformanceSectionId={activePerformanceSectionId}
                  performanceSectionRefs={performanceSectionRefs}
                />
              </div>
            </>
          ) : (
            <div style={{ color: '#a1a1aa' }}>Performance Mode is hidden.</div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 1fr) minmax(340px, 1fr)',
            gap: 24,
          }}
        >
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Artist DNA Analyzer</h2>

            {dnaAnalyzerMessage && <div style={{ color: '#a1a1aa', marginBottom: 12 }}>{dnaAnalyzerMessage}</div>}

            <div style={{ marginBottom: 16 }}>
              <label style={sectionTitleStyle}>Lyrics Samples</label>
              <textarea
                value={dnaAnalysisInput.lyrics_samples}
                onChange={(e) => updateDNAAnalysisInput('lyrics_samples', e.target.value)}
                style={{ ...textareaStyle, minHeight: 180 }}
                placeholder="Paste several lyrics samples here..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionTitleStyle}>Chord Examples</label>
              <textarea
                value={dnaAnalysisInput.chord_examples}
                onChange={(e) => updateDNAAnalysisInput('chord_examples', e.target.value)}
                style={textareaStyle}
                placeholder="Optional chord examples..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionTitleStyle}>Artist References</label>
              <textarea
                value={dnaAnalysisInput.artist_references}
                onChange={(e) => updateDNAAnalysisInput('artist_references', e.target.value)}
                style={textareaStyle}
                placeholder="Optional artist references..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionTitleStyle}>Self Description</label>
              <textarea
                value={dnaAnalysisInput.self_description}
                onChange={(e) => updateDNAAnalysisInput('self_description', e.target.value)}
                style={textareaStyle}
                placeholder="Optional description of your voice, style, strengths, aims..."
              />
            </div>

            <button onClick={analyzeArtistDNA} disabled={dnaAnalyzing} style={primaryButtonStyle}>
              {dnaAnalyzing ? 'Analyzing...' : 'Analyze My Style'}
            </button>
          </div>

          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Artist DNA Profiler</h2>

            {(artistDNALoading || artistDNAMessage) && (
              <div style={{ color: '#a1a1aa', marginBottom: 12 }}>
                {artistDNALoading ? 'Loading artist DNA...' : artistDNAMessage}
              </div>
            )}

            {artistDNA.dna_summary && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 12,
                  background: '#1f1f23',
                  border: '1px solid #3f3f46',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>DNA Summary</div>
                <div>{artistDNA.dna_summary}</div>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <label style={sectionTitleStyle}>Artist Name</label>
                <input
                  value={artistDNA.artist_name}
                  onChange={(e) => updateArtistDNA('artist_name', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Vocal Range</label>
                <input
                  value={artistDNA.vocal_range}
                  onChange={(e) => updateArtistDNA('vocal_range', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Core Genres</label>
                <textarea
                  value={artistDNA.core_genres}
                  onChange={(e) => updateArtistDNA('core_genres', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Lyrical Style</label>
                <textarea
                  value={artistDNA.lyrical_style}
                  onChange={(e) => updateArtistDNA('lyrical_style', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Emotional Tone</label>
                <textarea
                  value={artistDNA.emotional_tone}
                  onChange={(e) => updateArtistDNA('emotional_tone', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Writing Strengths</label>
                <textarea
                  value={artistDNA.writing_strengths}
                  onChange={(e) => updateArtistDNA('writing_strengths', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Words / Themes to Avoid</label>
                <textarea
                  value={artistDNA.avoid_list}
                  onChange={(e) => updateArtistDNA('avoid_list', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Visual Style</label>
                <textarea
                  value={artistDNA.visual_style}
                  onChange={(e) => updateArtistDNA('visual_style', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={sectionTitleStyle}>Performance Style</label>
                <textarea
                  value={artistDNA.performance_style}
                  onChange={(e) => updateArtistDNA('performance_style', e.target.value)}
                  style={textareaStyle}
                />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button onClick={saveArtistDNA} disabled={artistDNASaving} style={primaryButtonStyle}>
                {artistDNASaving ? 'Saving...' : 'Save Artist DNA'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>