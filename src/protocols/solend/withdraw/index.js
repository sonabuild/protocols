import { withdrawInputSchema, withdrawEnclaveSchema, withdrawOutputSchema } from './schemas.js';
import { prepareWithdrawInput } from './input.js';
import { buildWithdrawTransaction } from './enclave.js';
import { transformWithdrawOutput } from './output.js';

export default {
  id: 'solend:withdraw',
  name: 'Solend Withdraw',
  description: 'Withdraw tokens from Solend',
  schemas: { input: withdrawInputSchema, enclave: withdrawEnclaveSchema, output: withdrawOutputSchema },
  prep: prepareWithdrawInput,
  build: buildWithdrawTransaction,
  post: transformWithdrawOutput
};
