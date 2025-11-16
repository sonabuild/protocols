import { transferInputSchema, transferEnclaveSchema, transferOutputSchema } from './schemas.js';
import { prepareTransferInput } from './input.js';
import { buildTransferTransaction } from './enclave.js';
import { transformTransferOutput } from './output.js';
import { operationInput, enclaveInput, operationResponse } from '../../../shared/schemas.js';

export default {
  prep: {
    schema: operationInput(transferInputSchema),
    run: prepareTransferInput
  },
  build: {
    schema: enclaveInput(transferEnclaveSchema, transferInputSchema),
    run: buildTransferTransaction
  },
  post: {
    schema: operationResponse(transferOutputSchema),
    run: transformTransferOutput
  }
};
