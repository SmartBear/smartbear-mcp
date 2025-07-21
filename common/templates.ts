// Enhanced template for all MCP tool descriptions optimized for LLM understanding
export interface ToolDescriptionParams {
  summary: string;
  purpose: string;
  useCases: string[];
  examples: Array<{
    description: string;
    parameters: Record<string, any>;
    expectedOutput?: string;
  }>;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    examples?: string[];
    constraints?: string[];
  }>;
  hints: string[];
  prerequisites?: string[];
  limitations?: string[];
  relatedTools?: string[];
  outputFormat?: string;
  errorHandling?: string[];
}

export function toolDescriptionTemplate(params: ToolDescriptionParams): string {
  const {
    summary,
    useCases,
    examples,
    parameters,
    hints,
    outputFormat
  } = params;

  let description = summary;

  // Parameters (essential)
  if (parameters.length > 0) {
    description += `\n\n**Parameters:** ${parameters.map(p =>
      `${p.name} (${p.type})${p.required ? ' *required*' : ''}`
    ).join(', ')}`;
  }

  if (outputFormat) {
    description += `\n\n**Output Format:** ${outputFormat}`;
  }

  // Use Cases
  if (useCases.length > 0) {
    description += `\n\n**Use Cases:** ${useCases.map((uc, i) => `${i + 1}. ${uc}`).join(' ')}`;
  }

  // Examples
  if (examples.length > 0) {
    description += `\n\n**Examples:**\n` + examples.map((ex, idx) =>
      `${idx + 1}. ${ex.description}\n\`\`\`json\n${JSON.stringify(ex.parameters, null, 2)}\n\`\`\`${ex.expectedOutput ? `\nExpected Output: ${ex.expectedOutput}` : ''}`
    ).join('\n\n');
  }

  // Hints
  if (hints.length > 0) {
    description += `\n\n**Tips:** ${hints.map((hint, i) => `${i + 1}. ${hint}`).join(' ')}`;
  }

  return description.trim();
}

// Backward-compatible version of the original function
export function simpleToolDescriptionTemplate(
  summary: string,
  useCases: string[],
  examples: string[],
  hints: string[]
): string {
  return toolDescriptionTemplate({
    summary,
    purpose: summary,
    useCases,
    examples: examples.map(example => ({
      description: example,
      parameters: {}
    })),
    parameters: [],
    hints
  });
}

// Helper function to create parameter descriptions
export function createParameter(
  name: string,
  type: string,
  required: boolean,
  description: string,
  options: {
    examples?: string[];
    constraints?: string[];
  } = {}
): ToolDescriptionParams['parameters'][0] {
  return {
    name,
    type,
    required,
    description,
    examples: options.examples,
    constraints: options.constraints
  };
}

// Helper function to create examples with proper structure
export function createExample(
  description: string,
  parameters: Record<string, any>,
  expectedOutput?: string
): ToolDescriptionParams['examples'][0] {
  return {
    description,
    parameters,
    expectedOutput
  };
}
