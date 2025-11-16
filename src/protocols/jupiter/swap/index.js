/**
 * Jupiter Swap Protocol - Pipeline V2
 *
 * 3-stage pipeline:
 * 1. prep: Fetch route from Jupiter API (input.js)
 * 2. build: Validate and return pre-built transaction (enclave.js)
 * 3. post: Transform output (output.js)
 */

import { swapInputSchema, swapEnclaveSchema, swapOutputSchema } from './schemas.js';
import { prepareSwapInput } from './input.js';
import { buildSwapTransaction } from './enclave.js';
import { transformSwapOutput } from './output.js';

export default {
  id: 'jupiter:swap',
  name: 'Jupiter Swap',
  description: 'Swap tokens using Jupiter aggregator with optimal routing',

  // Schemas
  schemas: {
    input: swapInputSchema,
    enclave: swapEnclaveSchema,
    output: swapOutputSchema
  },

  // Pipeline stages
  prep: prepareSwapInput,
  build: buildSwapTransaction,
  post: transformSwapOutput
};
