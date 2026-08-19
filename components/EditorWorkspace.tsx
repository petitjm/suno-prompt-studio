"use client";

import SunoPromptBuilder from "./SunoPromptBuilder";

import React from "react";

import SongVersionEditor from "./SongVersionEditor";
import StructuredChordJsonEditor from "./StructuredChordJsonEditor";

import type {
  Project,
  ChordResponse,
  SongVersionRecord,
  ChordVersion,
} from "@/types/song";

type EditorWorkspaceSongProps = {
  performanceSheet: string;
  setPerformanceSheet: (value: string) => void;

  songVersions: SongVersionRecord[];
  activeSongVersionId: string | null;
  setActiveSongVersionId: React.Dispatch<React.SetStateAction<string | null>>;
  onSavedSongVersionChange: (id: string | null) => void;

  songVersionTitle: string;
  setSongVersionTitle: (value: string) => void;

  saveSong: () => void;
  savingSong: boolean;
  justSavedSong: boolean;
  resetAudioPreviewRequestState: () => void;

  activeProject: Project | null;
};

type EditorWorkspaceChordProps = {
  structuredChordJsonRef: React.RefObject<HTMLDivElement | null>;

  chordVersionTitle: string;
  setChordVersionTitle: (value: string) => void;

  chordsText: string;
  chordExtractionMessage: string;
  setChordExtractionMessage: (value: string) => void;
  setChordsText: (value: string) => void;
  setChords: React.Dispatch<React.SetStateAction<ChordResponse | null>>;

  chordVersions: ChordVersion[];
  activeChordVersionId: string | null;
  activeSongVersionId: string | null;
  setActiveChordVersionId: React.Dispatch<React.SetStateAction<string | null>>;
  resetAudioPreviewRequestState: () => void;

  saveChords: () => void;
  savingChords: boolean;
  justSavedChords: boolean;
};

type EditorWorkspaceSharedProps = {
  formatUkDateTime: (value: string) => string;
};

type EditorWorkspaceProps = {
  songEditor: EditorWorkspaceSongProps;
  chordEditor: EditorWorkspaceChordProps;
  shared: EditorWorkspaceSharedProps;
};

export default function EditorWorkspace({
  songEditor,
  chordEditor,
  shared,
}: EditorWorkspaceProps) {
  return (
    <>
      {/* Song sheet, saved versions, and save controls */}
      <SongVersionEditor
        performanceSheet={songEditor.performanceSheet}
        setPerformanceSheet={songEditor.setPerformanceSheet}
        songVersions={songEditor.songVersions}
        activeSongVersionId={songEditor.activeSongVersionId}
        setActiveSongVersionId={songEditor.setActiveSongVersionId}
        onSavedSongVersionChange={songEditor.onSavedSongVersionChange}
        formatUkDateTime={shared.formatUkDateTime}
        songVersionTitle={songEditor.songVersionTitle}
        setSongVersionTitle={songEditor.setSongVersionTitle}
        saveSong={songEditor.saveSong}
        savingSong={songEditor.savingSong}
        justSavedSong={songEditor.justSavedSong}
        resetAudioPreviewRequestState={songEditor.resetAudioPreviewRequestState}
        activeProject={songEditor.activeProject}
      />

      <SunoPromptBuilder
        performanceSheet={songEditor.performanceSheet}
        structuredChordJson={chordEditor.chordsText}
      />

      {/* Structured Chord JSON editor and saved chord-version selector */}
      <StructuredChordJsonEditor
        structuredChordJsonRef={chordEditor.structuredChordJsonRef}
        chordVersionTitle={chordEditor.chordVersionTitle}
        setChordVersionTitle={chordEditor.setChordVersionTitle}
        chordsText={chordEditor.chordsText}
        chordExtractionMessage={chordEditor.chordExtractionMessage}
        setChordExtractionMessage={chordEditor.setChordExtractionMessage}
        setChordsText={chordEditor.setChordsText}
        setChords={chordEditor.setChords}
        chordVersions={chordEditor.chordVersions}
        activeChordVersionId={chordEditor.activeChordVersionId}
        activeSongVersionId={chordEditor.activeSongVersionId}
        setActiveChordVersionId={chordEditor.setActiveChordVersionId}
        resetAudioPreviewRequestState={
          chordEditor.resetAudioPreviewRequestState
        }
        formatUkDateTime={shared.formatUkDateTime}
        saveChords={chordEditor.saveChords}
        savingChords={chordEditor.savingChords}
        justSavedChords={chordEditor.justSavedChords}
      />
    </>
  );
}
