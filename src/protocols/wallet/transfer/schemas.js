import { z } from 'zod';

export const transferInputSchema = z.object({
  recipient: z.string().describe('Recipient wallet address'),
  amount: z.number().positive().describe('Amount to transfer'),
  mint: z.string().optional().describe('Token mint address (omit for SOL)'),
  symbol: z.string().optional().describe('Token symbol'),
  memo: z.string().max(566).optional().describe('Optional memo')
});

export const transferEnclaveSchema = z.object({
  lifetime: z.object({
    blockhash: z.string(),
    lastValidBlockHeight: z.number()
  }),
  senderTokenAccount: z.string().optional(),
  recipientTokenAccount: z.string().optional()
});

export const transferOutputSchema = z.object({
  transfer: z.object({
    from: z.string(),
    to: z.string(),
    amount: z.string(),
    mint: z.string().optional(),
    symbol: z.string()
  })
});
