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
  if (!params) {
    throw new Error('params is undefined in buildSolendTransaction');
  }
  const operation = params.operation || 'deposit';

  if (operation === 'withdraw') {
    const result = buildWithdrawTransaction(params, context, prepared);
    return {
      wireTransaction: result.wireTransaction,
      withdraw: result.withdraw
    };
  } else {
    const result = buildDepositTransaction(params, context, prepared);
    return {
      wireTransaction: result.wireTransaction,
      deposit: result.deposit
    };
  }
}
