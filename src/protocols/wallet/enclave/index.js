/**
 * Wallet enclave transaction builders
 *
 * Enclave-safe entry point - no network calls, only transaction building.
 */

import { buildTransferTransaction } from './transfer.js';

export { buildTransferTransaction } from './transfer.js';

/**
 * Build Wallet transaction (enclave entry point)
 * @param {Object} config
 * @param {Object} config.context - User context {wallet, origin}
 * @param {Object} config.params - Operation params from schema
 * @param {Object} config.prepared - Derived data from context preparation
 */
export async function buildWalletTransaction({ context, params, prepared }) {
  const operation = params.operation || 'transfer';

  if (operation !== 'transfer') {
    throw new Error(`Unknown wallet operation: ${operation}`);
  }

  const result = buildTransferTransaction(params, context, prepared);

  return {
    wireTransaction: result.wireTransaction,
    transfer: result.transfer
  };
}
