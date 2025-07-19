import { describe, it, expect } from 'vitest';
import { pickFields, pickFieldsFromArray } from '../../../insight-hub/client/api/base.js';

describe('API Utilities', () => {
  describe('pickFields', () => {
    it('should pick only specified fields from object', () => {
      const input = { id: '1', name: 'Test', secret: 'hidden', extra: 'data' };
      const result = pickFields(input, ['id', 'name']);

      expect(result).toEqual({ id: '1', name: 'Test' });
      expect(result).not.toHaveProperty('secret');
      expect(result).not.toHaveProperty('extra');
    });

    it('should handle missing fields gracefully', () => {
      const input = { id: '1' };
      const result = pickFields(input, ['id', 'name', 'missing']);

      expect(result).toEqual({ id: '1' });
    });
  });

  describe('pickFieldsFromArray', () => {
    it('should pick fields from array of objects', () => {
      const input = [
        { id: '1', name: 'Test1', secret: 'hidden1' },
        { id: '2', name: 'Test2', secret: 'hidden2' }
      ];
      const result = pickFieldsFromArray(input, ['id', 'name']);

      expect(result).toEqual([
        { id: '1', name: 'Test1' },
        { id: '2', name: 'Test2' }
      ]);
    });
  });
});
