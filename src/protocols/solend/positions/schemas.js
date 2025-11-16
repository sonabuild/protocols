/**
 * Solend Positions - Business Schemas (Pipeline V2 Query)
 *
 * Business schemas only - no infrastructure wrappers
 * Uses shared helpers for Solana-specific types
 */
import { z } from 'zod';
import { SolanaAddress } from '../../../shared/schemas.js';

/**
 * Input schema - what the user provides
 * No parameters needed - derives obligation from wallet
 */
export const positionsInputSchema = z.object({});

/**
 * Output schema - what the query returns
 */
export const positionsOutputSchema = z.object({
  obligation: SolanaAddress.describe('User obligation account address'),
  exists: z.boolean().describe('Whether obligation account exists'),
  depositedUSDC: z.string().describe('Total USDC deposited in UI units'),
  depositedRaw: z.number().describe('Total USDC deposited in lamports'),
  deposits: z.array(z.object({
    depositedAmount: z.string().describe('Amount deposited in lamports')
  })).optional().describe('Individual deposit entries')
});
