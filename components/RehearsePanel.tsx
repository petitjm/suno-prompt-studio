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