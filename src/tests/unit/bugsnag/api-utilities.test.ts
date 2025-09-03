import { describe, it, expect } from 'vitest';
import { pickFields, pickFieldsFromArray, objectForEachRecursively } from '../../../bugsnag/client/api/base.js';

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

  describe("objectForEachRecursively", () => {
    it("should iterate through all key-value pairs recursively", () => {
      const input = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
        f: 4,
      };
      const keys: string[] = [];
      const values: any[] = [];

      objectForEachRecursively(input, (_, key, value) => {
        keys.push(key);
        values.push(value);
      });
      expect(keys).toEqual(["a", "c", "e", "f"]);
      expect(values).toEqual([1, 2, 3, 4]);
    });

    it("should handle empty objects", () => {
      const input = {
        a: {},
        b: 1,
      };
      const keys: string[] = [];
      const values: any[] = [];

      objectForEachRecursively(input, (_, key, value) => {
        keys.push(key);
        values.push(value);
      });
      expect(keys).toEqual(["b"]);
      expect(values).toEqual([1]);
    });

    it("should handle arrays by applying callback to the array value", () => {
      const input = {
        a: 1,
        b: [1, 2, 3],
        c: { d: [4, 5] },
      };
      const keys: string[] = [];
      const values: any[] = [];

      objectForEachRecursively(input, (_, key, value) => {
        keys.push(key);
        values.push(value);
      });
      expect(keys).toEqual(["a", "b", "d"]);
      expect(values).toEqual([1, [1, 2, 3], [4, 5]]);
    });

    it("should recurse into objects within arrays", () => {
      const input = {
        a: 1,
        b: [
          { name: "item1", value: 10 },
          { name: "item2", value: 20 }
        ],
      };
      const keys: string[] = [];
      const values: any[] = [];

      objectForEachRecursively(input, (_, key, value) => {
        keys.push(key);
        values.push(value);
      });
      
      expect(keys).toContain("a");
      expect(keys).toContain("b");
      expect(keys).toContain("name");
      expect(keys).toContain("value");
      expect(values).toContain(1);
      expect(values).toContain("item1");
      expect(values).toContain(10);
      expect(values).toContain("item2");
      expect(values).toContain(20);
    });

    it("should handle complex nested arrays of objects", () => {
      const input = {
        users: [
          { 
            id: 1, 
            details: { name: "Alice" },
            tags: ["admin", "user"]
          },
          { 
            id: 2, 
            details: { name: "Bob" },
            tags: ["user"]
          }
        ]
      };
      
      const keys: string[] = [];
      const values: any[] = [];
      
      objectForEachRecursively(input, (_, key, value) => {
        keys.push(key);
        if (typeof value !== "object") {
          values.push(value);
        }
      });
      
      expect(keys).toContain("users");
      expect(keys).toContain("id");
      expect(keys).toContain("name");
      expect(keys).toContain("tags");
      
      expect(values).toContain(1);
      expect(values).toContain(2);
      expect(values).toContain("Alice");
      expect(values).toContain("Bob");
    });

    it("should handle null and undefined values", () => {
      const input = {
        a: null,
        b: undefined,
        c: { d: null },
        e: 1,
      };
      const keys: string[] = [];
      const values: any[] = [];

      objectForEachRecursively(input, (_, key, value) => {
        keys.push(key);
        values.push(value);
      });
      expect(keys).toEqual(["a", "b", "d", "e"]);
      expect(values).toEqual([null, undefined, null, 1]);
    });

    it("should provide correct parent objects in callback", () => {
      const input = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
      };
      const parents: Record<string, any>[] = [];
      const keys: string[] = [];

      objectForEachRecursively(input, (parent, key, _) => {
        parents.push(parent);
        keys.push(key);
      });

      expect(keys).toEqual(["a", "c", "e"]);
      expect(parents[0]).toBe(input); // parent of 'a' is the root object
      expect(parents[1]).toBe(input.b); // parent of 'c' is the 'b' object
      expect(parents[2]).toBe(input.b.d); // parent of 'e' is the 'd' object
    });
  });
});
