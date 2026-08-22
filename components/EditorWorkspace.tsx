"use client";

import SunoPromptBuilder from "./SunoPromptBuilder";

import React from "react";

import SongVersionEditor from "./SongVersionEditor";

import type { Project, SongVersionRecord } from "@/types/song";

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

type EditorWorkspaceSharedProps = {
  formatUkDateTime: (value: string) => string;
};

type EditorWorkspaceProps = {
  activeTask: "song" | "compare" | "suno";
  songEditor: EditorWorkspaceSongProps;
  structuredChordJson: string;
  shared: EditorWorkspaceSharedProps;
};

export default function EditorWorkspace({
  activeTask,
  songEditor,
  structuredChordJson,
  shared,
}: EditorWorkspaceProps) {
  return (
    <>
      {activeTask === "song" && (
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
          resetAudioPreviewRequestState={
            songEditor.resetAudioPreviewRequestState
          }
          activeProject={songEditor.activeProject}
        />
      )}

      {activeTask === "suno" && (
        <SunoPromptBuilder
          performanceSheet={songEditor.performanceSheet}
          structuredChordJson={structuredChordJson}
        />
      )}
    </>
  );
}
