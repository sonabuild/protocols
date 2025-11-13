/**
 * Schema Registry
 * Central registry of all protocol schemas for export and discovery
 */

// Import protocol schemas
import { solendSchema } from '../protocols/solend/schema.js';
import { walletSchema } from '../protocols/wallet/schema.js';
import { jupiterSchema } from '../protocols/jupiter/schema.js';

/**
 * Protocol Registry
 * Maps protocol IDs to their schema definitions
 */
export const PROTOCOL_REGISTRY = {
  solend: solendSchema,
  wallet: walletSchema,
  jupiter: jupiterSchema
};

/**
 * Get all protocols
 * @returns {Object} Map of protocol ID to schema
 */
export function getAllProtocols() {
  return PROTOCOL_REGISTRY;
}

/**
 * Get protocol by ID
 * @param {string} protocolId - Protocol identifier
 * @returns {ProtocolSchema|null} Protocol schema or null if not found
 */
export function getProtocol(protocolId) {
  return PROTOCOL_REGISTRY[protocolId] || null;
}

/**
 * Get all LLM tool definitions across all protocols
 * Returns vendor-neutral tool definitions compatible with OpenAI, Anthropic, etc.
 * @returns {Array} Array of tool definitions
 */
export function getAllToolDefinitions() {
  const tools = [];

  for (const protocol of Object.values(PROTOCOL_REGISTRY)) {
    tools.push(...protocol.getToolDefinitions());
  }

  return tools;
}

/**
 * Export complete schema metadata for API consumption
 * Flat structure with endpoint paths as keys
 * @returns {Object} Schema metadata with routes and tools
 */
export function exportSchemaMetadata() {
  const routes = {};

  for (const [protocolId, protocol] of Object.entries(PROTOCOL_REGISTRY)) {
    // Export operations with endpoint path as key
    for (const [key, operation] of Object.entries(protocol.operations)) {
      const endpoint = `${protocolId}/${key}`;
      routes[endpoint] = {
        protocol: protocolId,
        label: operation.label,
        description: operation.description,
        operationType: operation.operationType,
        displayData: operation.displayData,
        attested: true,  // Operations require attestation
        schema: operation.toJSONSchema(),
        examples: operation.toAPIExamples()  // Full API examples with context
      };
    }

    // Export queries with endpoint path as key
    for (const [key, query] of Object.entries(protocol.queries)) {
      const endpoint = query.endpoint;  // Already in 'protocol/name' format
      routes[endpoint] = {
        protocol: protocolId,
        label: query.label,
        description: query.description,
        attested: false,  // Queries are read-only, no attestation
        schema: query.toJSONSchema(),
        examples: query.toAPIExamples(),  // Full API examples with context
        proactive: query.llm.canBeProactive || false,
        cardConfig: query.card || null
      };
    }
  }

  return {
    version: '1.0.0',
    description: 'Sona Protocol API - Attested Solana transactions',
    documentation: 'https://docs.sona.build',
    sdk: '@sonabuild/kit',
    routes,
    tools: getAllToolDefinitions()
  };
}
