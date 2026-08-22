"use client";

import React from "react";

import EditorWorkspace from "./EditorWorkspace";
import CompareVersionControls from "./CompareVersionControls";
import WritePanelHeader from "./WritePanelHeader";

import type {
  Project,
  ChordResponse,
  SongVersionRecord,
  ChordVersion,
} from "@/types/song";

// SongEditorPanel is now a wiring component.
// Main editor UI is grouped in EditorWorkspace:
// - SongVersionEditor handles lyrics, saved song versions, and song saving.
// - StructuredChordJsonEditor handles structured chord JSON, saved chord versions, and chord saving.

type SongEditorWorkspaceSongProps = {
  performanceSheet: string;
  setPerformanceSheet: (value: string) => void;

  songVersions: SongVersionRecord[];
  activeSongVersionId: string | null;
  setActiveSongVersionId: React.Dispatch<React.SetStateAction<string | null>>;
  onSavedSongVersionChange: (id: string | null) => void;

  songVersionTitle: string;
  setSongVersionTitle: (value: string) => void;

  activeProject: Project | null;

  savingSong: boolean;
  justSavedSong: boolean;
  saveSong: () => void;
  resetAudioPreviewRequestState: () => void;
};

type SongEditorWorkspaceChordProps = {
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

type SongEditorCompareProps = {
  comparingNow: boolean;
  setComparingNow: (value: boolean) => void;

  compareLeftSongId: string;
  setCompareLeftSongId: (value: string) => void;
  compareRightSongId: string;
  setCompareRightSongId: (value: string) => void;

  setCompareLeftText: (value: string) => void;
  setCompareRightText: (value: string) => void;

  setFlashLeftPanel: (value: boolean) => void;
  setFlashRightPanel: (value: boolean) => void;

  loadingLeftCurrent: boolean;
  setLoadingLeftCurrent: (value: boolean) => void;
  loadingRightCurrent: boolean;
  setLoadingRightCurrent: (value: boolean) => void;
};

type SongEditorSharedProps = {
  formatUkDateTime: (value: string) => string;
};

type SongEditorPanelProps = {
  activeTask: "song" | "compare" | "suno";
  songEditor: SongEditorWorkspaceSongProps;
  chordEditor: SongEditorWorkspaceChordProps;
  compareControls: SongEditorCompareProps;
  shared: SongEditorSharedProps;
};

export default function SongEditorPanel({
  activeTask,
  songEditor,
  chordEditor,
  compareControls,
  shared,
}: SongEditorPanelProps) {
  return (
    <>
      {activeTask === "song" && <WritePanelHeader />}
      <EditorWorkspace
        activeTask={activeTask}
        songEditor={{
          performanceSheet: songEditor.performanceSheet,
          setPerformanceSheet: songEditor.setPerformanceSheet,
          songVersions: songEditor.songVersions,
          activeSongVersionId: songEditor.activeSongVersionId,
          setActiveSongVersionId: songEditor.setActiveSongVersionId,
          onSavedSongVersionChange: songEditor.onSavedSongVersionChange,
          songVersionTitle: songEditor.songVersionTitle,
          setSongVersionTitle: songEditor.setSongVersionTitle,
          saveSong: songEditor.saveSong,
          savingSong: songEditor.savingSong,
          justSavedSong: songEditor.justSavedSong,
          resetAudioPreviewRequestState:
            songEditor.resetAudioPreviewRequestState,
          activeProject: songEditor.activeProject,
        }}
        structuredChordJson={chordEditor.chordsText}
        shared={{
          formatUkDateTime: shared.formatUkDateTime,
        }}
      />
      {activeTask === "compare" && (
        <CompareVersionControls
          source={{
            performanceSheet: songEditor.performanceSheet,
            songVersions: songEditor.songVersions,
            formatUkDateTime: shared.formatUkDateTime,
          }}
          actionState={{
            comparingNow: compareControls.comparingNow,
            setComparingNow: compareControls.setComparingNow,
            loadingLeftCurrent: compareControls.loadingLeftCurrent,
            setLoadingLeftCurrent: compareControls.setLoadingLeftCurrent,
            loadingRightCurrent: compareControls.loadingRightCurrent,
            setLoadingRightCurrent: compareControls.setLoadingRightCurrent,
          }}
          panelSelection={{
            compareLeftSongId: compareControls.compareLeftSongId,
            setCompareLeftSongId: compareControls.setCompareLeftSongId,
            compareRightSongId: compareControls.compareRightSongId,
            setCompareRightSongId: compareControls.setCompareRightSongId,
            setCompareLeftText: compareControls.setCompareLeftText,
            setCompareRightText: compareControls.setCompareRightText,
            setFlashLeftPanel: compareControls.setFlashLeftPanel,
            setFlashRightPanel: compareControls.setFlashRightPanel,
          }}
        />
      )}
    </>
  );
}
