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
import { operationInput, enclaveInput, operationResponse } from '../../../shared/schemas.js';

export default {
  prep: {
    schema: operationInput(swapInputSchema),
    run: prepareSwapInput
  },
  build: {
    schema: enclaveInput(swapEnclaveSchema, swapInputSchema),
    run: buildSwapTransaction
  },
  post: {
    schema: operationResponse(swapOutputSchema),
    run: transformSwapOutput
  }
};
