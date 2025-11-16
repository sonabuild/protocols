import { z } from 'zod';

export const depositInputSchema = z.object({
  amount: z.number().positive(),
  mint: z.string().optional(),
  symbol: z.string().optional()
});

export const depositEnclaveSchema = z.object({
  lifetime: z.object({ blockhash: z.string(), lastValidBlockHeight: z.number() }),
  reserve: z.string(),
  collateralMint: z.string(),
  userCollateralAccount: z.string().optional(),
  sourceTokenAccount: z.string()
});

export const depositOutputSchema = z.object({
  deposit: z.object({
    amount: z.string(),
    mint: z.string(),
    symbol: z.string()
  })
});
