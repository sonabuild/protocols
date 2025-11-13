/**
 * Base schema system for @sona/protocols
 *
 * Provides OperationSchema and QuerySchema classes for defining protocol operations
 * with runtime validation, UI generation, and LLM integration capabilities.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * User context schema - auto-injected by SDK, required by API
 * Contains wallet and origin for all requests
 */
export const UserContextSchema = z.object({
  wallet: z.string().describe('User wallet public key'),
  origin: z.string().describe('Request origin for validation')
});

/**
 * Extract label from Zod schema description
 */
function extractLabel(zodSchema) {
  return zodSchema.description || zodSchema._def?.typeName || 'Field';
}

/**
 * Extract min value from Zod number schema
 */
function extractMin(zodSchema) {
  const checks = zodSchema._def?.checks || [];
  const minCheck = checks.find(c => c.kind === 'min');
  return minCheck?.value;
}

/**
 * Extract max value from Zod number schema
 */
function extractMax(zodSchema) {
  const checks = zodSchema._def?.checks || [];
  const maxCheck = checks.find(c => c.kind === 'max');
  return maxCheck?.value;
}

/**
 * Operation schema for attested transactions
 *
 * Defines the params/context/output schemas, UI hints, and LLM integration metadata
 * for protocol operations like deposit, withdraw, swap, etc.
 */
export class OperationSchema {
  constructor(config) {
    this.id = config.id;
    this.label = config.label;
    this.description = config.description;
    this.operationType = config.operationType; // UI operation type (transfer, swap, deposit, etc.)
    this.paramsSchema = config.params;    // Zod schema for user params
    this.contextSchema = config.context;  // Zod schema for RPC context data
    this.outputSchema = config.output;    // Zod schema for operation data
    this.displayData = config.displayData; // Function to transform params for UI display
    this.llm = config.llm || {};          // LLM metadata
  }

  /**
   * Validate params and return result object
   * @param {Object} params - Params to validate
   * @returns {{ success: boolean, data?: Object, error?: ZodError }}
   */
  validateParams(params) {
    return this.paramsSchema.safeParse(params);
  }

  /**
   * Parse params (throws on invalid)
   * @param {Object} params - Params to parse
   * @returns {Object} Parsed and validated params
   */
  parseParams(params) {
    return this.paramsSchema.parse(params);
  }

  /**
   * Validate output
   * @param {Object} output - Output to validate
   * @returns {{ success: boolean, data?: Object, error?: ZodError }}
   */
  validateOutput(output) {
    return this.outputSchema.safeParse(output);
  }

  /**
   * Validate context
   * @param {Object} context - Context to validate
   * @returns {{ success: boolean, data?: Object, error?: ZodError }}
   */
  validateContext(context) {
    if (!this.contextSchema) {
      return { success: true, data: context };
    }
    return this.contextSchema.safeParse(context);
  }

  /**
   * Generate vendor-neutral tool definition for LLM integration
   * Compatible with OpenAI, Anthropic, and other LLM providers
   * @param {string} [endpoint] - Optional explicit API endpoint (e.g., 'solend/deposit')
   * @returns {Object} Function definition
   */
  toToolDefinition(endpoint) {
    const jsonSchema = zodToJsonSchema(this.paramsSchema);

    const toolDef = {
      type: 'function',
      function: {
        name: this.id,
        description: this.llm.description || this.description,
        parameters: {
          type: 'object',
          properties: jsonSchema.properties || {},
          required: jsonSchema.required || []
        }
      }
    };

    // Add explicit endpoint mapping if provided
    if (endpoint) {
      toolDef.endpoint = endpoint;
    }

    return toolDef;
  }

  /**
   * Generate UI form configuration
   * @returns {Object} Form configuration for dynamic UI generation
   */
  toFormConfig() {
    const shape = this.paramsSchema._def.shape();
    const fields = {};

    for (const [key, fieldSchema] of Object.entries(shape)) {
      fields[key] = {
        type: fieldSchema._def.typeName,
        required: !fieldSchema.isOptional(),
        label: extractLabel(fieldSchema),
        min: extractMin(fieldSchema),
        max: extractMax(fieldSchema),
        description: fieldSchema.description
      };
    }

    return { fields };
  }

  /**
   * Get JSON Schema representation for API documentation
   * @returns {{ params: Object, output: Object, request: Object }}
   */
  toJSONSchema() {
    const contextSchema = zodToJsonSchema(UserContextSchema);
    const paramsSchema = zodToJsonSchema(this.paramsSchema);
    const outputSchema = zodToJsonSchema(this.outputSchema);

    return {
      // User params
      params: paramsSchema,
      // Output data structure
      output: outputSchema,
      // Full request structure for API documentation
      request: {
        type: 'object',
        description: 'Complete API request structure for attested operations',
        properties: {
          encrypted: {
            type: 'string',
            description: 'Base64-encoded encrypted payload containing envelope, context, and params'
          },
          hint: {
            type: 'object',
            description: 'Plaintext hint for API to prepare context (must match encrypted data)',
            properties: {
              context: contextSchema,
              params: paramsSchema
            },
            required: ['context', 'params']
          },
          includeAttestation: {
            type: 'boolean',
            description: 'Whether to include attestation in response (default: true)',
            default: true
          }
        },
        required: ['encrypted', 'hint']
      }
    };
  }

  /**
   * Generate API examples with full request structure including context
   * Converts LLM examples to complete API documentation examples
   * @returns {Array<Object>} Array of API examples with request/response structure
   */
  toAPIExamples() {
    if (!this.llm.examples || this.llm.examples.length === 0) {
      return [];
    }

    return this.llm.examples.map(example => ({
      description: example.query || `${this.label} example`,
      request: {
        encrypted: "base64_encrypted_payload_containing_envelope_context_and_params",
        hint: {
          context: {
            wallet: "ExampleWallet1111111111111111111111111111111",
            origin: "https://app.sona.build"
          },
          params: example.params
        },
        includeAttestation: true
      },
      response: {
        transaction: "base64_encoded_transaction",
        attestation: {
          signature: "base64_signature",
          pcrs: {}
        },
        metadata: {
          protocol: this.id.split('_')[0],
          operation: this.operationType || this.id.split('_')[1],
          timestamp: Date.now()
        },
        data: {} // Operation-specific data
      }
    }));
  }
}

/**
 * Query schema for read-only operations
 *
 * Defines the params/output schema, UI hints, and LLM integration metadata
 * for protocol queries like positions, balances, rates, etc.
 */
export class QuerySchema {
  constructor(config) {
    this.id = config.id;
    this.endpoint = config.endpoint;      // API endpoint path
    this.label = config.label;
    this.description = config.description;
    this.paramsSchema = config.params;    // Zod schema
    this.outputSchema = config.output;    // Zod schema
    this.llm = config.llm || {};          // LLM metadata
    this.card = config.card || null;      // Card configuration for display
  }

  /**
   * Validate params
   * @param {Object} params - Params to validate
   * @returns {{ success: boolean, data?: Object, error?: ZodError }}
   */
  validateParams(params) {
    return this.paramsSchema.safeParse(params);
  }

  /**
   * Validate output
   * @param {Object} output - Output to validate
   * @returns {{ success: boolean, data?: Object, error?: ZodError }}
   */
  validateOutput(output) {
    return this.outputSchema.safeParse(output);
  }

  /**
   * Generate vendor-neutral tool definition (only if query can be proactive)
   * Compatible with OpenAI, Anthropic, and other LLM providers
   * @returns {Object|null} Function definition or null
   */
  toToolDefinition() {
    if (!this.llm.canBeProactive) return null;

    const jsonSchema = zodToJsonSchema(this.paramsSchema);

    return {
      type: 'function',
      function: {
        name: this.id,
        description: this.llm.description || this.description,
        parameters: {
          type: 'object',
          properties: jsonSchema.properties || {},
          required: jsonSchema.required || []
        }
      },
      // Explicit mapping to API route
      endpoint: this.endpoint
    };
  }

  /**
   * Get JSON Schema representation for API documentation
   * @returns {{ params: Object, output: Object, request: Object }}
   */
  toJSONSchema() {
    const contextSchema = zodToJsonSchema(UserContextSchema);
    const paramsSchema = zodToJsonSchema(this.paramsSchema);
    const outputSchema = zodToJsonSchema(this.outputSchema);

    return {
      // User params
      params: paramsSchema,
      // Output data structure
      output: outputSchema,
      // Full request structure for API documentation
      request: {
        type: 'object',
        description: 'Complete API request structure for queries',
        properties: {
          context: contextSchema,
          params: paramsSchema
        },
        required: ['context', 'params']
      }
    };
  }

  /**
   * Generate UI card configuration for displaying query results
   * @returns {Object} Card configuration
   */
  toCardConfig() {
    return {
      ...this.card,
      outputSchema: zodToJsonSchema(this.outputSchema)
    };
  }

  /**
   * Generate API examples with full request structure including context
   * Converts LLM examples to complete API documentation examples
   * @returns {Array<Object>} Array of API examples with request/response structure
   */
  toAPIExamples() {
    if (!this.llm.examples || this.llm.examples.length === 0) {
      return [];
    }

    return this.llm.examples.map(example => ({
      description: example.query || `${this.label} example`,
      request: {
        context: {
          wallet: "ExampleWallet1111111111111111111111111111111",
          origin: "https://app.sona.build"
        },
        params: example.params
      },
      response: {
        data: {} // Query-specific data
      }
    }));
  }
}

/**
 * Complete protocol schema with operations and queries
 */
export class ProtocolSchema {
  constructor(config) {
    this.id = config.id;
    this.label = config.label;
    this.description = config.description;
    this.operations = config.operations || {};  // Map of OperationSchema
    this.queries = config.queries || {};        // Map of QuerySchema
  }

  /**
   * Get all vendor-neutral tool definitions
   * Compatible with OpenAI, Anthropic, and other LLM providers
   * @returns {Array<Object>} Array of function definitions
   */
  getToolDefinitions() {
    const tools = [];

    // Add operation tools with explicit endpoint mapping
    for (const [key, operation] of Object.entries(this.operations)) {
      try {
        const endpoint = `${this.id}/${key}`;
        tools.push(operation.toToolDefinition(endpoint));
      } catch (err) {
        console.warn(`Failed to generate tool definition for operation ${key}:`, err.message);
      }
    }

    // Add proactive query tools (already have explicit endpoints)
    for (const [key, query] of Object.entries(this.queries)) {
      try {
        const tool = query.toToolDefinition();
        if (tool) tools.push(tool);
      } catch (err) {
        console.warn(`Failed to generate tool definition for query ${key}:`, err.message);
      }
    }

    return tools;
  }

  /**
   * Get operation by ID
   * @param {string} id - Operation ID
   * @returns {OperationSchema|undefined}
   */
  getOperation(id) {
    return this.operations[id];
  }

  /**
   * Get query by ID
   * @param {string} id - Query ID
   * @returns {QuerySchema|undefined}
   */
  getQuery(id) {
    return this.queries[id];
  }
}
