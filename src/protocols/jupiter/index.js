/**
 * Jupiter Protocol - Standardized API
 */

import { prepareJupiterSwapContext } from './context/index.js';
import { jupiterSchema } from './schema.js';

/**
 * Prepare context for Jupiter operation
 * @param {string} operation - Operation name ('swap')
 * @param {Object} config - Configuration { rpc, context, params }
 */
export async function prepareContext(operation, config) {
  if (operation !== 'swap') {
    throw new Error(`Unknown Jupiter operation: ${operation}. Available: swap`);
  }
  return await prepareJupiterSwapContext(config);
}

/**
 * Jupiter has no queries (all operations go through enclave)
 */
export async function executeQuery(query, config) {
  throw new Error(`Jupiter has no queries. Operations: swap`);
}

export const schema = jupiterSchema;
export const operations = ['swap'];
export const queries = [];
