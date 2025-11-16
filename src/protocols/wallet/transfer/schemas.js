/**
 * Wallet Transfer - Business Schemas (Pipeline V2)
 *
 * Business schemas only - no infrastructure wrappers
 * Uses shared helpers for Solana-specific types
 */
import { z } from 'zod';
import { SolanaAddress, BlockhashLifetime, WireTransaction } from '../../../shared/schemas.js';

/**
 * Input schema - what the user provides
 */
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

/**
 * Enclave schema - what prep step returns
 */
export const transferEnclaveSchema = z.object({
  lifetime: BlockhashLifetime,

  senderTokenAccount: SolanaAddress
    .optional()
    .describe('Sender token account (for SPL tokens)'),

  recipientTokenAccount: SolanaAddress
    .optional()
    .describe('Recipient token account (for SPL tokens)')
});

/**
 * Output schema - what the builder returns
 */
export const transferOutputSchema = z.object({
  wireTransaction: WireTransaction,

  transfer: z.object({
    from: SolanaAddress,
    to: SolanaAddress,
    amount: z.string().describe('Amount transferred in lamports'),
    mint: SolanaAddress.optional(),
    symbol: z.string()
  })
});
