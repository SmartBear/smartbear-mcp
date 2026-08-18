const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Parses a date string in any common format into year/month/day components.
 * Handles: YYYY-MM-DD, DD-MM-YYYY, MM-DD-YYYY, DD/MM/YYYY, MM/DD/YYYY, DD-MMM-YYYY.
 * When day/month order is ambiguous (both ≤ 12), assumes DD/MM (international default).
 */
export function parseDateFlexible(dateStr: string): ParsedDate | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const s = dateStr.trim();

  // YYYY-MM-DD (ISO)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };

  // DD-MMM-YYYY (e.g. 19-Jun-2000)
  m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const monthIdx = MONTH_ABBR.findIndex(
      (mo) => mo.toLowerCase() === m![2].toLowerCase(),
    );
    if (monthIdx >= 0) return { year: +m[3], month: monthIdx + 1, day: +m[1] };
  }

  // DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, MM-DD-YYYY
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const a = +m[1],
      b = +m[2],
      year = +m[3];
    // Unambiguous: one part > 12 means it must be a day
    if (a > 12 && b <= 12) return { year, month: b, day: a };
    if (b > 12 && a <= 12) return { year, month: a, day: b };
    // Ambiguous: assume DD/MM (international default)
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12)
      return { year, month: b, day: a };
    if (b >= 1 && b <= 31 && a >= 1 && a <= 12)
      return { year, month: a, day: b };
  }

  return null;
}

/**
 * Formats a parsed date into the project's configured date format string.
 * uniqueValue comes from projectInfo.dateTimeFormatNew[].unique_value.
 */
export function formatDateToProjectFormat(
  parsed: ParsedDate,
  uniqueValue: string,
): string {
  const yyyy = String(parsed.year).padStart(4, "0");
  const MM = String(parsed.month).padStart(2, "0");
  const dd = String(parsed.day).padStart(2, "0");
  const MMM = MONTH_ABBR[parsed.month - 1] ?? "Jan";

  switch (uniqueValue) {
    case "yyyy-MM-dd":
      return `${yyyy}-${MM}-${dd}`;
    case "MM-dd-yyyy":
      return `${MM}-${dd}-${yyyy}`;
    case "dd-MM-yyyy":
      return `${dd}-${MM}-${yyyy}`;
    case "dd-MMM-yyyy":
      return `${dd}-${MMM}-${yyyy}`;
    default:
      return `${yyyy}-${MM}-${dd}`;
  }
}

/**
 * Resolves the project's date format unique_value from project info response.
 * Falls back to ISO (yyyy-MM-dd) if not determinable.
 */
export function resolveProjectDateFormat(projectInfo: any): string {
  const formatId = projectInfo?.dateTimeFormatID;
  const formats: Array<{ id: number; unique_value: string }> =
    projectInfo?.dateTimeFormatNew ?? [];
  return formats.find((f) => f.id === formatId)?.unique_value ?? "yyyy-MM-dd";
}

/**
 * Normalizes all DATETIMEPICKER UDF fields in args (udfFields + step UDFs)
 * to the project's configured date format, regardless of what format the user provided.
 */
export function normalizeDateFieldsInArgs(
  a: Record<string, any>,
  datetimePickerFieldNames: Set<string>,
  targetFormat: string,
): void {
  if (a.udfFields && typeof a.udfFields === "object") {
    for (const [key, val] of Object.entries(a.udfFields)) {
      if (datetimePickerFieldNames.has(key) && typeof val === "string") {
        const parsed = parseDateFlexible(val);
        if (parsed)
          a.udfFields[key] = formatDateToProjectFormat(parsed, targetFormat);
      }
    }
  }
  if (Array.isArray(a.steps)) {
    for (const step of a.steps) {
      if (step?.UDF && typeof step.UDF === "object") {
        for (const [key, val] of Object.entries(step.UDF)) {
          if (datetimePickerFieldNames.has(key) && typeof val === "string") {
            const parsed = parseDateFlexible(val);
            if (parsed)
              step.UDF[key] = formatDateToProjectFormat(parsed, targetFormat);
          }
        }
      }
    }
  }
}

/**
 * Extracts DATETIMEPICKER field names from a UDF layout response.
 * Covers both entity-level fields and step-level fields (TC).
 */
export function extractDatetimePickerFieldNames(layout: any): Set<string> {
  const names = new Set<string>();
  for (const field of layout?.fields ?? []) {
    if (field.fieldTypeName === "DATETIMEPICKER") names.add(field.name);
  }
  for (const field of layout?.stepFields ?? []) {
    if (field.fieldTypeName === "DATETIMEPICKER") names.add(field.name);
  }
  return names;
}
