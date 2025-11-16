import { withdrawInputSchema, withdrawEnclaveSchema, withdrawOutputSchema } from './schemas.js';
import { prepareWithdrawInput } from './input.js';
import { buildWithdrawTransaction } from './enclave.js';
import { transformWithdrawOutput } from './output.js';
import { operationInput, enclaveInput, operationResponse } from '../../../shared/schemas.js';

export default {
  prep: {
    schema: operationInput(withdrawInputSchema),
    run: prepareWithdrawInput
  },
  build: {
    schema: enclaveInput(withdrawEnclaveSchema, withdrawInputSchema),
    run: buildWithdrawTransaction
  },
  post: {
    schema: operationResponse(withdrawOutputSchema),
    run: transformWithdrawOutput
  }
};
