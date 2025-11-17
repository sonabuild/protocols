import transfer from './transfer/index.js';
import balance from './balance/index.js';

export { transfer, balance };

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
