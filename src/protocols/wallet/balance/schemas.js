/**
 * Wallet Balance - Business Schemas (Pipeline V2 Query)
 *
 * Business schemas only - no infrastructure wrappers
 * Uses shared helpers for Solana-specific types
 */
import { z } from 'zod';
import { SolanaAddress } from '../../../shared/schemas.js';

/**
 * Input schema - what the user provides
 */
export const balanceInputSchema = z.object({
  symbols: z.array(z.string())
    .optional()
    .describe('Token symbols to query (e.g., ["SOL", "USDC"]). Omit for all supported tokens.')
});

/**
 * Output schema - what the query returns
 */
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
