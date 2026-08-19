import type { PatchApiEdit, PatchApiFailedEdit } from "./registry-types";

function countOccurrences(text: string, search: string): number {
  if (!search) return 0;
  return text.split(search).length - 1;
}

export function applyEdits(
  text: string,
  edits: PatchApiEdit[],
): { text: string; failed: PatchApiFailedEdit[] } {
  const failed: PatchApiFailedEdit[] = [];

  edits.forEach((edit, index) => {
    const matchCount = countOccurrences(text, edit.oldString);
    if (matchCount === 0) {
      failed.push({
        index,
        oldString: edit.oldString,
        error: "no_match",
        matchCount: 0,
      });
    } else if (matchCount > 1 && !edit.replaceAll) {
      failed.push({
        index,
        oldString: edit.oldString,
        error: "ambiguous",
        matchCount,
      });
    } else {
      text = text.split(edit.oldString).join(edit.replaceString);
    }
  });

  return { text, failed };
}
