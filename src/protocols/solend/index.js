/**
 * Solend Protocol - Pipeline V2
 * Exports all Solend operations and queries
 */

import deposit from './deposit/index.js';
import withdraw from './withdraw/index.js';
import positions from './positions/index.js';

// Re-export for protocol registry
export { deposit, withdraw, positions };

// Legacy schema export for API compatibility
// TODO: Remove once API is fully migrated to Pipeline V2
import { depositInputSchema, depositEnclaveSchema, depositOutputSchema } from './deposit/schemas.js';
import { withdrawInputSchema, withdrawEnclaveSchema, withdrawOutputSchema } from './withdraw/schemas.js';
import { positionsInputSchema, positionsOutputSchema } from './positions/schemas.js';

export const schema = {
  operations: {
    deposit: {
      input: depositInputSchema,
      enclave: depositEnclaveSchema,
      output: depositOutputSchema
    },
    withdraw: {
      input: withdrawInputSchema,
      enclave: withdrawEnclaveSchema,
      output: withdrawOutputSchema
    }
  },
  queries: {
    positions: {
      input: positionsInputSchema,
      output: positionsOutputSchema
    }
  }
};
