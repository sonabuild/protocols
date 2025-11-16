/**
 * Solend Withdraw - Business Schemas (Pipeline V2)
 *
 * Business schemas only - no infrastructure wrappers
 * Uses shared helpers for Solana-specific types
 */
import { z } from 'zod';
import { SolanaAddress, BlockhashLifetime, WireTransaction } from '../../../shared/schemas.js';

/**
 * Input schema - what the user provides
 */
export const withdrawInputSchema = z.object({
  amount: z.number()
    .positive()
    .describe('Amount of USDC to withdraw (in token units, not lamports)'),

  mint: SolanaAddress
    .optional()
    .describe('Token mint address (optional, defaults to USDC)'),

  symbol: z.string()
    .optional()
    .describe('Token symbol (optional, defaults to USDC)')
});

/**
 * Enclave schema - what prep step returns (same as deposit)
 */
export const withdrawEnclaveSchema = z.object({
  lifetime: BlockhashLifetime,

  userUsdcAta: SolanaAddress
    .describe('User USDC associated token account'),

  userCusdcAta: SolanaAddress
    .describe('User cUSDC collateral token account'),

  usdcAtaExists: z.boolean()
    .describe('Whether USDC ATA exists on-chain'),

  cusdcAtaExists: z.boolean()
    .describe('Whether cUSDC ATA exists on-chain'),

  obligationAccount: SolanaAddress
    .describe('User Solend obligation account'),

  obligationExists: z.boolean()
    .describe('Whether obligation account exists on-chain'),

  accounts: z.object({
    reserve: z.object({
      address: SolanaAddress,
      data: z.array(z.number())
    }),
    lendingMarket: z.object({
      address: SolanaAddress,
      data: z.array(z.number())
    })
  }).describe('Pre-fetched Solend account data')
});

/**
 * Output schema - what the builder returns
 */
export const withdrawOutputSchema = z.object({
  wireTransaction: WireTransaction,

  withdraw: z.object({
    amount: z.string().describe('Amount withdrawn in token units'),
    amountRaw: z.string().describe('Amount withdrawn in lamports'),
    tokenSymbol: z.string(),
    tokenMint: SolanaAddress,
    account: SolanaAddress.describe('Obligation account address')
  })
});
