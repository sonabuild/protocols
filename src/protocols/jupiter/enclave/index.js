/**
 * Jupiter Enclave Exports
 *
 * All enclave-safe pure transaction builders
 */

import { buildJupiterSwapTransaction } from './swap.js';

/**
 * Main Jupiter transaction builder
 * Routes to specific operation builders
 * @param {Object} config
 * @param {Object} config.context - User context {wallet, origin}
 * @param {Object} config.params - Operation params from schema
 * @param {Object} config.prepared - Derived data from context preparation
 */
export function buildJupiterTransaction({ context, params, prepared }) {
  const { operation } = params;

  switch (operation) {
    case 'swap':
      return buildJupiterSwapTransaction(params, context, prepared);
    default:
      throw new Error(`Unknown Jupiter operation: ${operation}`);
  }
}
