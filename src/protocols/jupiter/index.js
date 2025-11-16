/**
 * Jupiter Protocol - Pipeline V2
 * Exports all Jupiter operations
 */

import swap from './swap/index.js';

// Re-export for protocol registry
export { swap };

// Legacy schema export for API compatibility
// TODO: Remove once API is fully migrated to Pipeline V2
import { swapInputSchema, swapEnclaveSchema, swapOutputSchema } from './swap/schemas.js';

export const schema = {
  operations: {
    swap: {
      input: swapInputSchema,
      enclave: swapEnclaveSchema,
      output: swapOutputSchema
    }
  },
  queries: {}
};
