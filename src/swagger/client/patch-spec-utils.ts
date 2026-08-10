import type { PatchApiEdit, PatchApiFailedEdit } from "./registry-types";

function countOccurrences(text: string, search: string): number {
  if (!search) return 0;
  let count = 0;
  let index = text.indexOf(search);
  while (index !== -1) {
    count++;
    index = text.indexOf(search, index + search.length);
  }
  return count;
}

function replaceOccurrences(
  text: string,
  oldString: string,
  replaceString: string,
  replaceAll?: boolean,
): string {
  if (replaceAll) {
    return text.split(oldString).join(replaceString);
  }
  const index = text.indexOf(oldString);
  return (
    text.slice(0, index) + replaceString + text.slice(index + oldString.length)
  );
}

function formatYamlScalar(originalValue: string, newValue: string): string {
  const trimmed = originalValue.trim();
  if (trimmed.startsWith('"')) return `"${newValue}"`;
  if (trimmed.startsWith("'")) return `'${newValue}'`;
  return newValue;
}

export function setVersionToYamlSpec(text: string, newVersion: string): string {
  const lines = text.split("\n");
  let inInfoBlock = false;
  let infoIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const infoMatch = /^(\s*)info:\s*$/.exec(line);
    if (infoMatch) {
      inInfoBlock = true;
      infoIndent = infoMatch[1].length;
      continue;
    }

    if (!inInfoBlock) continue;

    if (line.trim() === "") continue;

    const currentIndent = /^(\s*)/.exec(line)?.[1].length ?? 0;
    if (currentIndent <= infoIndent) {
      inInfoBlock = false;
      continue;
    }

    const versionMatch = /^(\s*version:\s*)(.*)$/.exec(line);
    if (versionMatch) {
      lines[i] =
        `${versionMatch[1]}${formatYamlScalar(versionMatch[2], newVersion)}`;
      break;
    }
  }

  return lines.join("\n");
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
      text = replaceOccurrences(
        text,
        edit.oldString,
        edit.replaceString,
        edit.replaceAll,
      );
      applied.push(index);
    }
  });

  return { text, applied, failed };
}
