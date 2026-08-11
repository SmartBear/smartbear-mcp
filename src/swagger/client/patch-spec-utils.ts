import type { PatchApiEdit, PatchApiFailedEdit } from "./registry-types";

function countOccurrences(text: string, search: string): number {
  if (!search) return 0;
  return text.split(search).length - 1;
}

function indentWidth(line: string): number {
  return /^\s*/.exec(line)?.[0].length ?? 0;
}

export function setVersionToYamlSpec(text: string, newVersion: string): string {
  const lines = text.split("\n");
  const infoIndex = lines.findIndex((line) => /^\s*info:\s*$/.test(line));
  if (infoIndex === -1) return text;

  const infoIndent = indentWidth(lines[infoIndex]);

  for (let i = infoIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (indentWidth(line) <= infoIndent) break;

    // Capture the quoting style so it is preserved around the new value.
    const match = /^(\s*version:\s*)(["']?).*?\2\s*$/.exec(line);
    if (match) {
      lines[i] = `${match[1]}${match[2]}${newVersion}${match[2]}`;
      return lines.join("\n");
    }
  }

  return text;
}

export function applyEdits(
  text: string,
  edits: PatchApiEdit[],
): { text: string; applied: number[]; failed: PatchApiFailedEdit[] } {
  const applied: number[] = [];
  const failed: PatchApiFailedEdit[] = [];

  edits.forEach((edit, index) => {
    const matchCount = countOccurrences(text, edit.oldString);
    if (matchCount === 0) {
      failed.push({ index, error: "no_match", matchCount: 0 });
    } else if (matchCount > 1 && !edit.replaceAll) {
      failed.push({ index, error: "ambiguous", matchCount });
    } else {
      text = text.split(edit.oldString).join(edit.replaceString);
      applied.push(index);
    }
  });

  return { text, applied, failed };
}
