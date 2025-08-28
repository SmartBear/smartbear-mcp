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
export type FilterType = 'eq' | 'ne' | 'empty';

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
export interface FilterObject {
  [fieldName: string]: FilterValue[];
}

export const FilterValueSchema = z.object({
  type: z.enum(['eq', 'ne', 'empty']),
  value: z.union([z.string(), z.boolean(), z.number()]),
});

export const FilterObjectSchema = z.record(z.array(FilterValueSchema));

/**
 * Creates a filter value object for equality comparison
 * 
 * @param value The value to compare against
 * @returns FilterValue with type 'eq'
 */
export function equals(value: string | number): FilterValue {
  return {
    type: 'eq',
    value,
  };
}

/**
 * Creates a filter value object for inequality comparison
 * 
 * @param value The value to compare against
 * @returns FilterValue with type 'ne'
 */
export function notEquals(value: string | number): FilterValue {
  return {
    type: 'ne',
    value,
  };
}

/**
 * Creates a filter value object for checking if a field is empty or not
 * 
 * @param isEmpty Whether the field should be empty (true) or not (false)
 * @returns FilterValue with type 'empty'
 */
export function empty(isEmpty: boolean): FilterValue {
  return {
    type: 'empty',
    value: isEmpty.toString(),
  };
}

/**
 * Creates a relative time filter for event.since or event.before
 * 
 * @param value The amount of time
 * @param unit The time unit ('h' for hours, 'd' for days)
 * @returns FilterValue for the relative time
 */
export function relativeTime(value: number, unit: 'h' | 'd'): FilterValue {
  return {
    type: 'eq',
    value: `${value}${unit}`,
  };
}

/**
 * Creates an ISO 8601 time filter (must be in UTC format like 2018-05-20T00:00:00Z)
 * 
 * @param date The date object to convert to ISO string
 * @returns FilterValue for the ISO time
 */
export function isoTime(date: Date): FilterValue {
  return {
    type: 'eq',
    value: date.toISOString(),
  };
}

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

/**
 * Converts a FilterObject to a query string
 * 
 * @param filters The filter object to convert
 * @returns Query string representation of the filters
 */
export function toQueryString(filters: FilterObject): string {
  return toUrlSearchParams(filters).toString();
}

/**
 * Helper to build a FilterObject with type safety
 * 
 * @returns An empty FilterObject that can be built upon
 */
export function createFilter(): FilterObject {
  return {};
}

/**
 * Adds a field filter to an existing FilterObject
 * 
 * @param filters The FilterObject to add to
 * @param field The field name (e.g., 'error.status', 'event.since')
 * @param filterValue The FilterValue to add
 * @returns The updated FilterObject for chaining
 */
export function addFilter(
  filters: FilterObject,
  field: string,
  filterValue: FilterValue
): FilterObject {
  if (!filters[field]) {
    filters[field] = [];
  }
  filters[field].push(filterValue);
  return filters;
}

/**
 * Utility to create a time range filter between two dates
 * 
 * @param filters The FilterObject to add to
 * @param since Start date
 * @param before End date
 * @returns The updated FilterObject for chaining
 */
export function addTimeRange(
  filters: FilterObject,
  since: Date,
  before: Date
): FilterObject {
  addFilter(filters, 'event.since', isoTime(since));
  addFilter(filters, 'event.before', isoTime(before));
  return filters;
}

/**
 * Utility to create a relative time range filter
 * 
 * @param filters The FilterObject to add to
 * @param amount The amount of time (e.g., 7 for 7 days)
 * @param unit The time unit ('h' for hours, 'd' for days)
 * @returns The updated FilterObject for chaining
 */
export function addRelativeTimeRange(
  filters: FilterObject,
  amount: number,
  unit: 'h' | 'd'
): FilterObject {
  addFilter(filters, 'event.since', relativeTime(amount, unit));
  return filters;
}

/**
 * Usage examples:
 * 
 * // Example 1: Open errors with events in the last day
 * const filters = createFilter();
 * addRelativeTimeRange(filters, 1, 'd');
 * addFilter(filters, 'error.status', equals('open'));
 * const queryString = toQueryString(filters);
 * 
 * // Example 2: Events affecting specific users on a specific day
 * const filters = createFilter();
 * addTimeRange(filters, new Date('2017-01-01'), new Date('2017-01-02'));
 * addFilter(filters, 'user.email', equals('user1@example.com'));
 * addFilter(filters, 'user.email', equals('user2@example.com'));
 * const queryString = toQueryString(filters);
 * 
 * // Example 3: Events that have user data
 * const filters = createFilter();
 * addFilter(filters, 'user.id', empty(false));
 * const queryString = toQueryString(filters);
 */
