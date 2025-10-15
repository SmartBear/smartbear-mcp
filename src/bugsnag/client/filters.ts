/**
 * Filters utility for BugSnag API
 *
 * This file provides utility functions for creating filter URL parameters
 * based on the BugSnag filtering specification described in the Filtering.md document.
 */
import { z } from "zod";

/**
 * Types of filter comparison operations
 */
export type FilterType = "eq" | "ne" | "empty";

/**
 * Single filter value with its comparison type
 */
export interface FilterValue {
  /** The type of comparison to perform */
  type: FilterType;
  /** The value to compare against */
  value: string | boolean | number;
}

/**
 * Filter object structure as specified in the BugSnag API
 *
 * Example:
 * {
 *   "event.field": [{ "type": "eq", "value": "filter value 1" }],
 *   "error.status": [{ "type": "empty", "value": "true" }]
 * }
 */
export interface FilterObject extends Record<string, any> {
  [fieldName: string]: FilterValue[];
}

export const FilterValueSchema = z.object({
  type: z.enum(["eq", "ne", "empty"]),
  value: z.union([z.string(), z.boolean(), z.number()]),
});

export const FilterObjectSchema = z.record(z.array(FilterValueSchema));

/**
 * Converts a FilterObject to URL search parameters
 *
 * @param filters The filter object to convert
 * @returns URLSearchParams object with the encoded filters
 */
export function toUrlSearchParams(filters: FilterObject): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([field, filterValues]) => {
    filterValues.forEach((filterValue) => {
      params.append(`filters[${field}][][type]`, filterValue.type);
      params.append(`filters[${field}][][value]`, filterValue.value.toString());
    });
  });

  return params;
}
