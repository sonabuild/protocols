import { z } from 'zod';
import jupiterSwap from './protocols/jupiter/swap/index.js';
import walletTransfer from './protocols/wallet/transfer/index.js';
import walletBalance from './protocols/wallet/balance/index.js';
import solendDeposit from './protocols/solend/deposit/index.js';
import solendWithdraw from './protocols/solend/withdraw/index.js';
import solendPositions from './protocols/solend/positions/index.js';

export const PROTOCOLS = {
  'solend:deposit': solendDeposit,
  'solend:withdraw': solendWithdraw,
  'solend:positions': solendPositions,
  'jupiter:swap': jupiterSwap,
  'wallet:transfer': walletTransfer,
  'wallet:balance': walletBalance
};

/**
 * Get protocol definition
 * @param {string} protocol - Protocol name (e.g., "jupiter")
 * @param {string} operation - Operation name (e.g., "swap")
 * @returns {object|null} Protocol definition or null
 */
export function getProtocol(protocol, operation) {
  const key = `${protocol}:${operation}`;
  return PROTOCOLS[key] || null;
}

/**
 * Check if protocol exists
 * @param {string} protocol - Protocol name
 * @param {string} operation - Operation name
 * @returns {boolean}
 */
export function hasProtocol(protocol, operation) {
  const key = `${protocol}:${operation}`;
  return key in PROTOCOLS;
}

/**
 * List all protocols
 * @returns {Array<string>} Array of "protocol:operation" strings
 */
export function listProtocols() {
  return Object.keys(PROTOCOLS);
}

/**
 * Extract business schema from wrapped input schema
 * Extracts the 'params' field from operationInput/queryInput wrappers
 *
 * Note: Zod v4 changed internal structure from _def to def
 */
function extractInputSchema(wrappedSchema) {
  // Zod v4 uses 'def' instead of '_def'
  const def = wrappedSchema?.def || wrappedSchema?._def;
  if (!def?.shape) {
    return null;
  }

  // In Zod v4, shape is a getter property, not a function
  const shape = typeof def.shape === 'function' ? def.shape() : def.shape;

  // For operationInput: extract from hint.params
  if (shape.hint) {
    const hintDef = shape.hint.def || shape.hint._def;
    if (hintDef?.shape) {
      const hintShape = typeof hintDef.shape === 'function' ? hintDef.shape() : hintDef.shape;
      return hintShape.params || null;
    }
  }

  // For queryInput: extract from params directly
  if (shape.params) {
    return shape.params;
  }

  return null;
}

/**
 * Extract business schema from wrapped output schema
 * Extracts the 'data' field from operationResponse/queryResponse wrappers
 */
function extractOutputSchema(wrappedSchema) {
  // Zod v4 uses 'def' instead of '_def'
  const def = wrappedSchema?.def || wrappedSchema?._def;
  if (!def?.shape) {
    return null;
  }

  // In Zod v4, shape is a getter property, not a function
  const shape = typeof def.shape === 'function' ? def.shape() : def.shape;

  // For operationResponse/queryResponse: extract from data field
  if (shape.data) {
    const dataDef = shape.data.def || shape.data._def;
    // data is optional, so we need to get the inner type
    if (dataDef?.innerType) {
      return dataDef.innerType;
    }
    // In Zod v4, optional types might use unwrap()
    if (shape.data.unwrap) {
      return shape.data.unwrap();
    }
  }

  return null;
}

/**
 * Get default display order for protocol operations
 * @param {string} protocol - Protocol name
 * @param {string} operation - Operation name
 * @returns {number} Display order (lower numbers appear first)
 */
function getDefaultOrder(protocol, operation) {
  // Define a sensible ordering for common operations
  const orderMap = {
    'jupiter:swap': 1,
    'wallet:transfer': 2,
    'wallet:balance': 3,
    'solend:deposit': 10,
    'solend:withdraw': 11,
    'solend:positions': 12
  };

  const key = `${protocol}:${operation}`;
  return orderMap[key] || 999;
}

/**
 * Export schema metadata for capabilities endpoint
 * @returns {object} Schema metadata with routes and schemas information
 */
export function exportSchemaMetadata() {
  const routes = {};

  for (const [key, protocol] of Object.entries(PROTOCOLS)) {
    const [protocolName, operationName] = key.split(':');
    const type = protocol.build ? 'operation' : 'query';

    // Extract schemas from protocol definition
    let inputSchema = null;
    let outputSchema = null;

    try {
      // Get full input schema from prep stage (includes context, params, etc.)
      if (protocol.prep?.schema) {
        inputSchema = z.toJSONSchema(protocol.prep.schema);
      }
    } catch (error) {
      console.warn(`Failed to extract input schema for ${key}:`, error.message);
    }

    try {
      // Get full output schema from post stage (includes success, error, data, etc.)
      if (protocol.post?.schema) {
        outputSchema = z.toJSONSchema(protocol.post.schema);
      }
    } catch (error) {
      console.warn(`Failed to extract output schema for ${key}:`, error.message);
    }

    // Capitalize operation name for display label
    const label = operationName.charAt(0).toUpperCase() + operationName.slice(1);
    const path = `/${protocolName}/${operationName}`;

    routes[path] = {
      type,
      attested: type === 'operation',  // Kit expects 'attested', not 'requiresAttestation'
      protocol: protocolName,
      operation: operationName,
      label,  // Display name for frontend
      path,  // Route path for navigation
      schemas: {
        input: inputSchema,
        output: outputSchema
      },
      ui: {
        order: getDefaultOrder(protocolName, operationName)
      }
    };
  }

  return {
    version: '2.0',
    protocols: listProtocols(),
    routes
  };
}
