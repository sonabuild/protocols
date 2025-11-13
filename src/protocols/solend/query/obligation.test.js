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
