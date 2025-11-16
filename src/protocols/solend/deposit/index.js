import { depositInputSchema, depositEnclaveSchema, depositOutputSchema } from './schemas.js';
import { prepareDepositInput } from './input.js';
import { buildDepositTransaction } from './enclave.js';
import { transformDepositOutput } from './output.js';
import { operationInput, enclaveInput, operationResponse } from '../../../shared/schemas.js';

export default {
  prep: {
    schema: operationInput(depositInputSchema),
    run: prepareDepositInput
  },
  build: {
    schema: enclaveInput(depositEnclaveSchema, depositInputSchema),
    run: buildDepositTransaction
  },
  post: {
    schema: operationResponse(depositOutputSchema),
    run: transformDepositOutput
  }
};
