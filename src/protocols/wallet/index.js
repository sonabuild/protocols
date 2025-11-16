/**
 * Wallet Protocol - Pipeline V2
 * Exports all Wallet operations and queries
 */

import transfer from './transfer/index.js';
import balance from './balance/index.js';

// Re-export for protocol registry
export { transfer, balance };

// Legacy schema export for API compatibility
// TODO: Remove once API is fully migrated to Pipeline V2
import { transferInputSchema, transferEnclaveSchema, transferOutputSchema } from './transfer/schemas.js';
import { balanceInputSchema, balanceOutputSchema } from './balance/schemas.js';

export const schema = {
  operations: {
    transfer: {
      input: transferInputSchema,
      enclave: transferEnclaveSchema,
      output: transferOutputSchema
    }
  },
  queries: {
    balance: {
      input: balanceInputSchema,
      output: balanceOutputSchema
    }
  }
};
