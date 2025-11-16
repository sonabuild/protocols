import { transferInputSchema, transferEnclaveSchema, transferOutputSchema } from './schemas.js';
import { prepareTransferInput } from './input.js';
import { buildTransferTransaction } from './enclave.js';
import { transformTransferOutput } from './output.js';

export default {
  id: 'wallet:transfer',
  name: 'Wallet Transfer',
  description: 'Transfer SOL or SPL tokens',

  schemas: {
    input: transferInputSchema,
    enclave: transferEnclaveSchema,
    output: transferOutputSchema
  },

  prep: prepareTransferInput,
  build: buildTransferTransaction,
  post: transformTransferOutput
};
