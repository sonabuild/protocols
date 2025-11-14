/**
 * Tests for Solend obligation queries
 *
 * Note: These tests use the real Solana RPC to test actual network behavior
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { getPosition, parseObligation } from './obligation.js';
import { createSolanaRpc } from '@solana/rpc';

describe('Solend Obligation Queries', () => {
  let rpc;
  const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  beforeAll(() => {
    rpc = createSolanaRpc(RPC_URL);
  });

  describe('parseObligation', () => {
    test('should handle empty buffer gracefully', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = parseObligation(emptyBuffer);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should handle null buffer gracefully', () => {
      const result = parseObligation(null);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should handle buffer too small for deposits', () => {
      const smallBuffer = Buffer.alloc(100);
      const result = parseObligation(smallBuffer);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should handle valid obligation with zero deposits', () => {
      // Create a buffer with depositsLen = 0 at offset 202
      const buffer = Buffer.alloc(300);
      buffer.writeUInt16LE(0, 202); // depositsLen = 0

      const result = parseObligation(buffer);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should reject excessive deposit count (DoS protection)', () => {
      // Create a buffer claiming 100 deposits (over MAX_DEPOSITS = 10)
      const buffer = Buffer.alloc(300);
      buffer.writeUInt16LE(100, 202); // depositsLen = 100

      const result = parseObligation(buffer);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should handle non-Buffer input', () => {
      const result = parseObligation('not a buffer');

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should handle undefined input', () => {
      const result = parseObligation(undefined);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should handle buffer too small for depositsLen field', () => {
      // Buffer with 203 bytes (just 1 byte short of depositsLen field)
      const buffer = Buffer.alloc(203);
      const result = parseObligation(buffer);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should handle buffer too small for deposits data', () => {
      // Buffer with depositsLen = 2 but not enough space for 2 deposits
      const buffer = Buffer.alloc(250); // Need 204 + (2 * 112) = 428 bytes
      buffer.writeUInt16LE(2, 202); // depositsLen = 2

      const result = parseObligation(buffer);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]);
      expect(result.totalDeposited).toBe('0');
    });

    test('should parse valid obligation with single deposit', () => {
      // Create buffer with 1 deposit of 1,000,000 lamports
      const buffer = Buffer.alloc(400);
      buffer.writeUInt16LE(1, 202); // depositsLen = 1

      // Write deposit amount at offset 204 + 32 = 236
      const depositAmount = 1000000n;
      buffer.writeBigUInt64LE(depositAmount, 236);

      const result = parseObligation(buffer);

      expect(result).toBeDefined();
      expect(result.deposits).toHaveLength(1);
      expect(result.deposits[0].depositedAmount).toBe('1000000');
      expect(result.totalDeposited).toBe('1000000');
    });

    test('should parse valid obligation with multiple deposits', () => {
      // Create buffer with 3 deposits
      const buffer = Buffer.alloc(600);
      buffer.writeUInt16LE(3, 202); // depositsLen = 3

      // Write deposit amounts
      buffer.writeBigUInt64LE(1000000n, 236); // First deposit at 204 + 32
      buffer.writeBigUInt64LE(2000000n, 348); // Second deposit at 204 + 112 + 32
      buffer.writeBigUInt64LE(3000000n, 460); // Third deposit at 204 + 224 + 32

      const result = parseObligation(buffer);

      expect(result).toBeDefined();
      expect(result.deposits).toHaveLength(3);
      expect(result.deposits[0].depositedAmount).toBe('1000000');
      expect(result.deposits[1].depositedAmount).toBe('2000000');
      expect(result.deposits[2].depositedAmount).toBe('3000000');
      expect(result.totalDeposited).toBe('1000000');
    });

    test('should return empty when buffer is too small for claimed deposits', () => {
      // Buffer with depositsLen = 3 but only enough space for 2 complete deposits
      const buffer = Buffer.alloc(430); // Enough for 2 deposits (204 + 224 = 428)
      buffer.writeUInt16LE(3, 202); // depositsLen = 3

      buffer.writeBigUInt64LE(1000000n, 236); // First deposit
      buffer.writeBigUInt64LE(2000000n, 348); // Second deposit
      // Third deposit would start at 460 but buffer ends at 430

      const result = parseObligation(buffer);

      expect(result).toBeDefined();
      expect(result.deposits).toEqual([]); // Should return empty if buffer too small
      expect(result.totalDeposited).toBe('0');
    });
  });

  describe('getPosition', () => {
    test('should return non-existent for account that does not exist', async () => {
      // Use a valid address that doesn't exist on-chain (generated from random bytes)
      const obligation = 'CktRuQ2mttgRGkXJtyksdKHjUdc2C4TgDzyB98oEzy8';

      const result = await getPosition(rpc, { obligation });

      expect(result).toBeDefined();
      expect(result.exists).toBe(false);
      expect(result.deposited).toBe('0');
    }, 15000);
  });
});
