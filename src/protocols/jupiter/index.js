import swap from './swap/index.js';

export { swap };

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
