/**
 * Solend Protocol - Standardized API
 */

import { prepareSolendContext } from './context/index.js';
import { getPosition } from './query/index.js';
import { solendSchema } from './schema.js';

/**
 * Prepare context for Solend operation
 * @param {string} operation - Operation name ('deposit' | 'withdraw')
 * @param {Object} config - Configuration { rpc, context, params }
 */
export async function prepareContext(operation, config) {
  if (operation !== 'deposit' && operation !== 'withdraw') {
    throw new Error(`Unknown Solend operation: ${operation}. Available: deposit, withdraw`);
  }
  return await prepareSolendContext(config);
}

/**
 * Execute Solend query
 * @param {string} query - Query name ('positions')
 * @param {Object} config - Configuration { rpc, context, params }
 */
export async function executeQuery(query, config) {
  if (query === 'positions') {
    return await getPosition(config.rpc, config.params);
  }
  throw new Error(`Unknown Solend query: ${query}. Available: positions`);
}

/**
 * Protocol schema
 */
export const schema = solendSchema;

/**
 * Available operations and queries
 */
export const operations = ['deposit', 'withdraw'];
export const queries = ['positions'];
