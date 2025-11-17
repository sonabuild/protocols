import { positionsInputSchema, positionsOutputSchema } from './schemas.js';
import { preparePositionsInput } from './input.js';
import { queryInput, queryResponse } from '../../../shared/schemas.js';

export default {
  prep: {
    schema: queryInput(positionsInputSchema),
    run: preparePositionsInput
  },
  post: {
    schema: queryResponse(positionsOutputSchema),
    run: async (fullResponse) => fullResponse
  }
};
