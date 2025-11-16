/**
 * Wallet Balance Query - Pipeline V2
 *
 * 2-stage pipeline (queries have no build step):
 * 1. prep: Fetch balance via RPC (input.js)
 * 2. post: Transform output (optional)
 */

import { balanceInputSchema, balanceOutputSchema } from './schemas.js';
import { prepareBalanceInput } from './input.js';
import { queryInput, queryResponse } from '../../../shared/schemas.js';

export default {
  prep: {
    schema: queryInput(balanceInputSchema),
    run: prepareBalanceInput
  },
  post: {
    schema: queryResponse(balanceOutputSchema),
    run: async (fullResponse) => fullResponse
  }
};
