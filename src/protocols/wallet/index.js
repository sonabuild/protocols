/**
 * Wallet Protocol - Standardized API
 */

import { prepareTransferContext } from './context/index.js';
import { getTokenBalance } from './query/index.js';
import { walletSchema } from './schema.js';

/**
 * Prepare context for Wallet operation
 * @param {string} operation - Operation name ('transfer')
 * @param {Object} config - Configuration { rpc, context, params }
 */
export async function prepareContext(operation, config) {
  if (operation !== 'transfer') {
    throw new Error(`Unknown Wallet operation: ${operation}. Available: transfer`);
  }
  return await prepareTransferContext(config);
}

/**
 * Execute Wallet query
 * @param {string} query - Query name ('balance')
 * @param {Object} config - Configuration { rpc, context, params }
 */
export async function executeQuery(query, config) {
  if (query === 'balance') {
    return await getTokenBalance(config.rpc, config.params);
  }
  throw new Error(`Unknown Wallet query: ${query}. Available: balance`);
}

export const schema = walletSchema;
export const operations = ['transfer'];
export const queries = ['balance'];
