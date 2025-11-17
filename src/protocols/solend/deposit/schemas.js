import { z } from 'zod';
import { SolanaAddress, BlockhashLifetime, WireTransaction } from '../../../shared/schemas.js';

export const depositInputSchema = z.object({
  amount: z.number()
    .positive()
    .describe('Amount of USDC to deposit (in token units, not lamports)'),

  mint: SolanaAddress
    .optional()
    .describe('Token mint address (optional, defaults to USDC)'),

  symbol: z.string()
    .optional()
    .describe('Token symbol (optional, defaults to USDC)')
});

export const depositEnclaveSchema = z.object({
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

export const depositOutputSchema = z.object({
  deposit: z.object({
    amount: z.string().describe('Amount deposited in token units'),
    amountRaw: z.string().describe('Amount deposited in lamports'),
    tokenSymbol: z.string(),
    tokenMint: SolanaAddress,
    account: SolanaAddress.describe('Obligation account address')
  })
});
