import { describe, it, expect } from 'vitest';
import {
  equals,
  notEquals,
  empty,
  relativeTime,
  isoTime,
  toUrlSearchParams,
  FilterObject
} from '../../../bugsnag/client/api/filters.js';

describe('Filter Utilities', () => {
  describe('equals', () => {
    it('should create eq filter for string value', () => {
      const result = equals('test-value');
      expect(result).toEqual({ type: 'eq', value: 'test-value' });
    });

    it('should create eq filter for number value', () => {
      const result = equals(42);
      expect(result).toEqual({ type: 'eq', value: 42 });
    });
  });

  describe('notEquals', () => {
    it('should create ne filter for string value', () => {
      const result = notEquals('test-value');
      expect(result).toEqual({ type: 'ne', value: 'test-value' });
    });

    it('should create ne filter for number value', () => {
      const result = notEquals(42);
      expect(result).toEqual({ type: 'ne', value: 42 });
    });
  });

  describe('empty', () => {
    it('should create empty filter for true', () => {
      const result = empty(true);
      expect(result).toEqual({ type: 'empty', value: 'true' });
    });

    it('should create empty filter for false', () => {
      const result = empty(false);
      expect(result).toEqual({ type: 'empty', value: 'false' });
    });
  });

  describe('relativeTime', () => {
    it('should create relative time filter with hours', () => {
      const result = relativeTime(24, 'h');
      expect(result).toEqual({ type: 'eq', value: '24h' });
    });

    it('should create relative time filter with days', () => {
      const result = relativeTime(7, 'd');
      expect(result).toEqual({ type: 'eq', value: '7d' });
    });
  });

  describe('isoTime', () => {
    it('should create ISO time filter from date', () => {
      const date = new Date('2023-01-01T12:00:00.000Z');
      const result = isoTime(date);
      expect(result).toEqual({ type: 'eq', value: '2023-01-01T12:00:00.000Z' });
    });
  });

  describe('toUrlSearchParams', () => {
    it('should convert simple filter object to URL params', () => {
      const filters: FilterObject = {
        'error.status': [{ type: 'eq', value: 'open' }],
        'user.email': [{ type: 'ne', value: 'test@example.com' }]
      };

      const result = toUrlSearchParams(filters);

      expect(result.get('filters[error.status][][type]')).toBe('eq');
      expect(result.get('filters[error.status][][value]')).toBe('open');
      expect(result.get('filters[user.email][][type]')).toBe('ne');
      expect(result.get('filters[user.email][][value]')).toBe('test@example.com');
    });

    it('should handle multiple filters for same field', () => {
      const filters: FilterObject = {
        'error.status': [
          { type: 'eq', value: 'open' },
          { type: 'eq', value: 'in_progress' }
        ]
      };

      const result = toUrlSearchParams(filters);
      const allEntries = Array.from(result.entries());

      // Should have entries for both filter values
      const statusFilters = allEntries.filter(([key]) => key.includes('error.status'));
      expect(statusFilters.length).toBeGreaterThan(2); // type and value for each filter
    });

    it('should handle empty filter object', () => {
      const filters: FilterObject = {};
      const result = toUrlSearchParams(filters);
      expect(result.toString()).toBe('');
    });

    it('should handle complex filter scenarios', () => {
      const filters: FilterObject = {
        'event.since': [{ type: 'eq', value: '7d' }],
        'error.status': [{ type: 'ne', value: 'resolved' }],
        'user.id': [{ type: 'empty', value: 'false' }]
      };

      const result = toUrlSearchParams(filters);

      expect(result.get('filters[event.since][][value]')).toBe('7d');
      expect(result.get('filters[error.status][][value]')).toBe('resolved');
      expect(result.get('filters[user.id][][value]')).toBe('false');
    });
  });
});
