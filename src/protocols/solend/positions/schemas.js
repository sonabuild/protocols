import { z } from 'zod';
import { SolanaAddress } from '../../../shared/schemas.js';

export const positionsInputSchema = z.object({});

export const positionsOutputSchema = z.object({
  obligation: SolanaAddress.describe('User obligation account address'),
  exists: z.boolean().describe('Whether obligation account exists'),
  depositedUSDC: z.string().describe('Total USDC deposited in UI units'),
  depositedRaw: z.number().describe('Total USDC deposited in lamports'),
  deposits: z.array(z.object({
    depositedAmount: z.string().describe('Amount deposited in lamports')
  })).optional().describe('Individual deposit entries')
});
