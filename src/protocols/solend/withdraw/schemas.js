import { z } from 'zod';

export const withdrawInputSchema = z.object({
  amount: z.number().positive(),
  mint: z.string().optional(),
  symbol: z.string().optional()
});

export const withdrawEnclaveSchema = z.object({
  lifetime: z.object({ blockhash: z.string(), lastValidBlockHeight: z.number() }),
  reserve: z.string(),
  collateralMint: z.string(),
  userCollateralAccount: z.string(),
  destinationTokenAccount: z.string()
});

export const withdrawOutputSchema = z.object({
  withdraw: z.object({
    amount: z.string(),
    mint: z.string(),
    symbol: z.string()
  })
});
