/**
 * Solend Protocol - Standardized API
 */

import { prepareSolendContext, deriveObligationFromWallet } from './context/index.js';
import { getPosition } from './query/index.js';
import { solendSchema } from './schema.js';
import { address } from '@solana/addresses';

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
    const obligationAddress = await deriveObligationFromWallet(address(config.context.wallet));
    const position = await getPosition(config.rpc, { obligation: obligationAddress });

    const depositedUSDC = position.exists
      ? (Number(position.deposited) / 1_000_000).toString()
      : '0';

    return {
      obligation: String(obligationAddress),
      exists: position.exists,
      depositedUSDC,
      depositedRaw: Number(position.deposited)
    };
  }
  throw new Error(`Unknown Solend query: ${query}. Available: positions`);
}

export const schema = solendSchema;
export const operations = ['deposit', 'withdraw'];
export const queries = ['positions'];
