import { describe, it, expect } from 'vitest';
import {
  toolDescriptionTemplate,
  createParameter,
  createExample,
  ToolDescriptionParams
} from '../../../common/templates.js';

describe('Template Utilities', () => {
  describe('createParameter', () => {
    it('should create basic parameter object', () => {
      const result = createParameter('testParam', 'string', true, 'A test parameter');

      expect(result).toEqual({
        name: 'testParam',
        type: 'string',
        required: true,
        description: 'A test parameter'
      });
    });

    it('should create parameter with options', () => {
      const result = createParameter('testParam', 'number', false, 'A test parameter', {
        examples: ['1', '2', '3'],
        constraints: ['Must be positive']
      });

      expect(result).toEqual({
        name: 'testParam',
        type: 'number',
        required: false,
        description: 'A test parameter',
        examples: ['1', '2', '3'],
        constraints: ['Must be positive']
      });
    });
  });

  describe('createExample', () => {
    it('should create basic example object', () => {
      const result = createExample('Test example', { param1: 'value1' });

      expect(result).toEqual({
        description: 'Test example',
        parameters: { param1: 'value1' }
      });
    });

    it('should create example with expected output', () => {
      const result = createExample('Test example', { param1: 'value1' }, 'Expected result');

      expect(result).toEqual({
        description: 'Test example',
        parameters: { param1: 'value1' },
        expectedOutput: 'Expected result'
      });
    });
  });

  describe('toolDescriptionTemplate', () => {
    it('should generate basic tool description', () => {
      const params: ToolDescriptionParams = {
        summary: 'Test tool summary',
        purpose: 'Test purpose',
        useCases: ['Use case 1', 'Use case 2'],
        examples: [
          {
            description: 'Example 1',
            parameters: { param1: 'value1' },
            expectedOutput: 'Result 1'
          }
        ],
        parameters: [
          {
            name: 'param1',
            type: 'string',
            required: true,
            description: 'Test parameter'
          }
        ],
        hints: ['Hint 1', 'Hint 2']
      };

      const result = toolDescriptionTemplate(params);

      expect(result).toContain('Test tool summary');
      expect(result).toContain('**Parameters:** param1 (string) *required*');
      expect(result).toContain('**Use Cases:** 1. Use case 1 2. Use case 2');
      expect(result).toContain('**Examples:**');
      expect(result).toContain('Example 1');
      expect(result).toContain('param1');
      expect(result).toContain('value1');
      expect(result).toContain('Expected Output: Result 1');
      expect(result).toContain('**Tips:** 1. Hint 1 2. Hint 2');
    });

    it('should handle optional parameters correctly', () => {
      const params: ToolDescriptionParams = {
        summary: 'Test tool',
        purpose: 'Test purpose',
        useCases: ['Use case'],
        examples: [],
        parameters: [
          {
            name: 'required_param',
            type: 'string',
            required: true,
            description: 'Required parameter'
          },
          {
            name: 'optional_param',
            type: 'number',
            required: false,
            description: 'Optional parameter'
          }
        ],
        hints: []
      };

      const result = toolDescriptionTemplate(params);

      expect(result).toContain('required_param (string) *required*');
      expect(result).toContain('optional_param (number)');
      expect(result).not.toContain('optional_param (number) *required*');
    });

    it('should handle empty sections gracefully', () => {
      const params: ToolDescriptionParams = {
        summary: 'Minimal tool',
        purpose: 'Test purpose',
        useCases: [],
        examples: [],
        parameters: [],
        hints: []
      };

      const result = toolDescriptionTemplate(params);

      expect(result).toBe('Minimal tool');
      expect(result).not.toContain('**Parameters:**');
      expect(result).not.toContain('**Use Cases:**');
      expect(result).not.toContain('**Examples:**');
      expect(result).not.toContain('**Tips:**');
    });

    it('should format JSON examples correctly', () => {
      const params: ToolDescriptionParams = {
        summary: 'Test tool',
        purpose: 'Test purpose',
        useCases: ['Test'],
        examples: [
          {
            description: 'Complex example',
            parameters: {
              nested: {
                object: 'value',
                array: [1, 2, 3]
              }
            }
          }
        ],
        parameters: [],
        hints: []
      };

      const result = toolDescriptionTemplate(params);

      expect(result).toContain('```json');
      expect(result).toContain('"nested"');
      expect(result).toContain('"object": "value"');
      expect(result).toContain('"array": [');
    });
  });
});
