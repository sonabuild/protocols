import deposit from './deposit/index.js';
import withdraw from './withdraw/index.js';
import positions from './positions/index.js';

export { deposit, withdraw, positions };

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
