/**
 * Schema Registry Export
 * Exports schema registry functions for API/LLM usage
 */

export {
  PROTOCOL_REGISTRY,
  getAllProtocols,
  getProtocol,
  getAllToolDefinitions,
  exportSchemaMetadata
} from './schema/registry.js';
