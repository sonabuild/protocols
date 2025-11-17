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
