/**
 * Tests for builder utilities (transaction validation wrapper)
 */

import { describe, test, expect } from 'bun:test';
import { validateBuiltTransaction } from './builders.js';

describe('Builder Utils', () => {
  describe('validateBuiltTransaction', () => {
    test('should accept valid transaction under size limit', () => {
      // Create a valid transaction (small base64)
      const validTx = Buffer.alloc(500).toString('base64');

      // Should not throw
      expect(() => validateBuiltTransaction(validTx, 'Test Protocol', null)).not.toThrow();
    });

    test('should throw on transaction over size limit', () => {
      // Create a transaction over 1232 bytes
      const oversizedTx = Buffer.alloc(1300).toString('base64');

      expect(() => validateBuiltTransaction(oversizedTx, 'Test Protocol', null))
        .toThrow(/too large/);
    });

    test('should include protocol name in error', () => {
      const oversizedTx = Buffer.alloc(1300).toString('base64');

      try {
        validateBuiltTransaction(oversizedTx, 'Jupiter Swap', null);
        expect(true).toBe(false); // Should not reach
      } catch (error) {
        expect(error.message).toContain('1300');
        expect(error.message).toContain('1232');
      }
    });

    test('should accept transaction at exact limit', () => {
      // 1232 bytes = 1643 base64 characters (rounded up)
      const atLimitTx = Buffer.alloc(1232).toString('base64');

      expect(() => validateBuiltTransaction(atLimitTx, 'Test Protocol', null)).not.toThrow();
    });
  });
});
