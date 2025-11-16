import { depositInputSchema, depositEnclaveSchema, depositOutputSchema } from './schemas.js';
import { prepareDepositInput } from './input.js';
import { buildDepositTransaction } from './enclave.js';
import { transformDepositOutput } from './output.js';

export default {
  id: 'solend:deposit',
  name: 'Solend Deposit',
  description: 'Deposit tokens to earn interest on Solend',
  schemas: { input: depositInputSchema, enclave: depositEnclaveSchema, output: depositOutputSchema },
  prep: prepareDepositInput,
  build: buildDepositTransaction,
  post: transformDepositOutput
};
