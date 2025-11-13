/**
 * Solana-specific Zod schema types
 *
 * Provides reusable Zod schemas for common Solana data types like addresses,
 * token amounts, and transaction-related fields.
 */

import { z } from 'zod';
import { address } from '@solana/addresses';

/**
 * Solana address (Base58 encoded public key)
 *
 * Validates that the string is valid Base58 and decodes to exactly 32 bytes
 * Uses @solana/addresses for validation
 */
export const SolanaAddress = z
  .string()
  .min(32, 'Solana address must be at least 32 characters')
  .max(44, 'Solana address must be at most 44 characters')
  .refine((addr) => {
    try {
      // Use @solana/addresses to validate - will throw if invalid
      address(addr);
      return true;
    } catch (error) {
      return false;
    }
  }, {
    message: 'Solana address must be valid Base58 encoding of a 32-byte public key'
  })
  .describe('Solana wallet or account address (Base58)');

/**
 * Token amount in lamports (smallest unit)
 *
 * @param {number} decimals - Token decimals (e.g., 6 for USDC, 9 for SOL)
 * @param {string} symbol - Token symbol (e.g., "USDC", "SOL")
 * @param {number} min - Minimum amount in lamports
 * @param {number} max - Maximum amount in lamports
 * @returns {ZodNumber} Zod schema for token amount
 */
export function TokenAmount(decimals, symbol, min, max) {
  return z
    .number()
    .int(`${symbol} amount must be an integer (lamports)`)
    .min(min, `${symbol} amount must be at least ${min} lamports (${(min / 10 ** decimals).toFixed(decimals)} ${symbol})`)
    .max(max, `${symbol} amount cannot exceed ${max} lamports (${(max / 10 ** decimals).toFixed(decimals)} ${symbol})`)
    .describe(`${symbol} amount in smallest unit (lamports, ${decimals} decimals)`);
}

/**
 * Base64 encoded transaction wire format
 */
export const WireTransaction = z
  .string()
  .min(1, 'Transaction cannot be empty')
  .describe('Base64 encoded Solana transaction ready for signing');

/**
 * Blockhash lifetime (blockhash + lastValidBlockHeight)
 */
export const BlockhashLifetime = z.object({
  blockhash: z
    .string()
    .length(44, 'Blockhash must be 44 characters')
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Blockhash must be valid Base58')
    .describe('Recent Solana blockhash'),
  lastValidBlockHeight: z.bigint().describe('Last valid block height for this blockhash')
}).describe('Blockhash with lifetime information for transaction validity');
