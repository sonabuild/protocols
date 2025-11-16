/**
 * Solend Positions Query - Pipeline V2
 *
 * 2-stage pipeline (queries have no build step):
 * 1. prep: Fetch position via RPC (input.js)
 * 2. post: Transform output (optional)
 */

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
