/**
 * Solend enclave transaction builders
 *
 * Enclave-safe entry point - no network calls, only transaction building.
 */

import { buildDepositTransaction } from './deposit.js';
import { buildWithdrawTransaction } from './withdraw.js';

export { buildDepositTransaction } from './deposit.js';
export { buildWithdrawTransaction } from './withdraw.js';

/**
 * Build Solend transaction (enclave entry point)
 * @param {Object} config
 * @param {Object} config.context - User context {wallet, origin}
 * @param {Object} config.params - Operation params from schema
 * @param {Object} config.prepared - Derived data from context preparation
 */
export async function buildSolendTransaction({ context, params, prepared }) {
  const operation = params.operation || 'deposit';

  const result = operation === 'withdraw'
    ? buildWithdrawTransaction(params, context, prepared)
    : buildDepositTransaction(params, context, prepared);

  return {
    wireTransaction: result.wireTransaction,
    [operation]: result[operation]
  };
}
