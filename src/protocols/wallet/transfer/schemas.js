import { z } from 'zod';
import { SolanaAddress, BlockhashLifetime, WireTransaction } from '../../../shared/schemas.js';

export const transferInputSchema = z.object({
  recipient: SolanaAddress
    .describe('Recipient wallet address'),

  amount: z.number()
    .positive()
    .describe('Amount to transfer (in token units, not lamports)'),

  mint: SolanaAddress
    .optional()
    .describe('Token mint address (omit for SOL transfers)'),

  symbol: z.string()
    .optional()
    .describe('Token symbol (e.g., "USDC", "SOL")'),

  memo: z.string()
    .max(566)
    .optional()
    .describe('Optional memo (max 566 characters)')
});

export const transferEnclaveSchema = z.object({
  lifetime: BlockhashLifetime,

  senderTokenAccount: SolanaAddress
    .optional()
    .describe('Sender token account (for SPL tokens)'),

  recipientTokenAccount: SolanaAddress
    .optional()
    .describe('Recipient token account (for SPL tokens)')
});

export const transferOutputSchema = z.object({
  transfer: z.object({
    from: SolanaAddress,
    to: SolanaAddress,
    amount: z.string().describe('Amount transferred in lamports'),
    mint: SolanaAddress.optional(),
    symbol: z.string()
  })
});
