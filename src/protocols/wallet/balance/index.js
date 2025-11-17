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
