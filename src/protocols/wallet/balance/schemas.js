import { z } from 'zod';
import { SolanaAddress } from '../../../shared/schemas.js';

export const balanceInputSchema = z.object({
  symbols: z.array(z.string())
    .optional()
    .describe('Token symbols to query (e.g., ["SOL", "USDC"]). Omit for all supported tokens.')
});

export const balanceOutputSchema = z.union([
  // Single token response
  z.object({
    symbol: z.string(),
    mint: SolanaAddress.optional(),
    amount: z.string().describe('Token amount in UI units'),
    amountRaw: z.string().describe('Token amount in lamports'),
    decimals: z.number()
  }),
  // Multiple tokens response
  z.record(z.string(), z.object({
    symbol: z.string(),
    mint: SolanaAddress.optional(),
    amount: z.string().describe('Token amount in UI units'),
    amountRaw: z.string().describe('Token amount in lamports'),
    decimals: z.number()
  }))
]);
