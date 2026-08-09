"use client";

import type { ChordVersion } from "@/types/song";

// Selector-only props. Version loading logic lives in StructuredChordJsonEditor.
type SavedChordVersionSelectorProps = {
  chordVersions: ChordVersion[];
  activeChordVersionId: string | null;
  activeSongVersionId: string | null;
  onActiveChordVersionChange: (id: string) => void;
  formatUkDateTime: (value: string) => string;
};

export default function SavedChordVersionSelector({
  chordVersions,
  activeChordVersionId,
  activeSongVersionId,
  onActiveChordVersionChange,
  formatUkDateTime,
}: SavedChordVersionSelectorProps) {
  const selectedChordVersionExists = chordVersions.some(
    (version) => version.id === activeChordVersionId,
  );

  const selectedValue = selectedChordVersionExists
    ? activeChordVersionId || ""
    : "";
  const getChordVersionSortRank = (version: ChordVersion) => {
    if (version.song_version_id === activeSongVersionId) {
      return 0;
    }

    if (version.song_version_id) {
      return 1;
    }

    return 2;
  };

  const sortedChordVersions = [...chordVersions].sort((a, b) => {
    const rankDifference =
      getChordVersionSortRank(a) - getChordVersionSortRank(b);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return chordVersions.indexOf(a) - chordVersions.indexOf(b);
  });

  const getChordVersionSelectLabel = (version: ChordVersion, index: number) => {
    const title =
      version.title || `Untitled chord version ${chordVersions.length - index}`;

    const dateSuffix = version.created_at
      ? ` (${formatUkDateTime(version.created_at)})`
      : "";

    if (!version.song_version_id) {
      return `[Old/unlinked] ${title}${dateSuffix}`;
    }

    if (version.song_version_id === activeSongVersionId) {
      return `[Current song] ${title}${dateSuffix}`;
    }

    return `[Other song] ${title}${dateSuffix}`;
  };

  return (
    <div className={`mt-3 ${chordVersions.length === 0 ? "opacity-75" : ""}`}>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Saved Chord Versions ({chordVersions.length})
      </label>

      <select
        value={selectedValue}
        onChange={(e) => onActiveChordVersionChange(e.target.value)}
        disabled={chordVersions.length === 0}
        className="w-full px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {chordVersions.length === 0
            ? "No saved chord versions yet"
            : "Choose a saved chord version..."}
        </option>

        {sortedChordVersions.map((v, i) => (
          <option key={v.id} value={v.id}>
            {getChordVersionSelectLabel(v, i)}
          </option>
        ))}
      </select>
      {chordVersions.length === 0 && (
        <p className="mt-2 text-xs text-gray-400">
          Save structured chord JSON to create a reusable chord version.
        </p>
      )}
    </div>
  );
}
