/**
 * Tests for transaction validation utilities
 */

import { describe, test, expect } from 'bun:test';
import {
  validateTransactionSize,
  validateInstructionCount,
  getTransactionInfo,
  TRANSACTION_LIMITS
} from './transactions.js';

describe('Transaction Utils', () => {
  describe('validateTransactionSize', () => {
    test('should validate transaction under size limit', () => {
      const validTx = Buffer.alloc(500).toString('base64');
      const result = validateTransactionSize(validTx);

      expect(result.valid).toBe(true);
      expect(result.size).toBe(500);
      expect(result.warning).toBeUndefined();
    });

    test('should reject transaction over size limit', () => {
      const oversizedTx = Buffer.alloc(1300).toString('base64');
      const result = validateTransactionSize(oversizedTx);

      expect(result.valid).toBe(false);
      expect(result.size).toBe(1300);
      expect(result.error).toContain('1300');
      expect(result.error).toContain('1232');
    });

    test('should warn at 90% capacity', () => {
      // 90% of 1232 = 1108.8 bytes
      const nearLimitTx = Buffer.alloc(1110).toString('base64');
      const result = validateTransactionSize(nearLimitTx);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('90%');
    });

    test('should accept transaction at exact limit', () => {
      const atLimitTx = Buffer.alloc(TRANSACTION_LIMITS.MAX_SIZE).toString('base64');
      const result = validateTransactionSize(atLimitTx);

      expect(result.valid).toBe(true);
      expect(result.size).toBe(TRANSACTION_LIMITS.MAX_SIZE);
    });

    test('should include protocol name in messages', () => {
      const oversizedTx = Buffer.alloc(1300).toString('base64');
      const result = validateTransactionSize(oversizedTx, 'Jupiter Swap');

      expect(result.error).toContain('Jupiter Swap');
    });
  });

  describe('validateInstructionCount', () => {
    test('should accept instruction count under limit', () => {
      const result = validateInstructionCount(10);

      expect(result.valid).toBe(true);
      expect(result.count).toBe(10);
    });

    test('should reject instruction count over 64', () => {
      const result = validateInstructionCount(65);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('65');
      expect(result.error).toContain('64');
    });

    test('should accept exactly 64 instructions', () => {
      const result = validateInstructionCount(64);

      expect(result.valid).toBe(true);
      expect(result.count).toBe(64);
    });

    test('should reject negative instruction count', () => {
      const result = validateInstructionCount(-1);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    test('should reject zero instructions', () => {
      const result = validateInstructionCount(0);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least one instruction');
    });

    test('should reject non-integer instruction count', () => {
      const result = validateInstructionCount(5.5);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expected integer');
    });

    test('should reject non-number instruction count', () => {
      const result = validateInstructionCount('10');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expected integer');
    });

    test('should warn for high instruction count', () => {
      const result = validateInstructionCount(15);

      expect(result.valid).toBe(true);
      expect(result.count).toBe(15);
      expect(result.warning).toContain('unusually high');
    });

    test('should not warn for 10 instructions', () => {
      const result = validateInstructionCount(10);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    test('should include protocol name in messages', () => {
      const result = validateInstructionCount(100, 'Test Protocol');

      expect(result.error).toContain('Test Protocol');
    });
  });

  describe('validateTransactionSize - error paths', () => {
    test('should reject non-string transaction', () => {
      const result = validateTransactionSize(12345);

      expect(result.valid).toBe(false);
      expect(result.size).toBe(0);
      expect(result.error).toContain('expected base64 string');
      expect(result.error).toContain('number');
    });
  });

  describe('getTransactionInfo', () => {
    test('should return transaction size information', () => {
      const tx = Buffer.alloc(500).toString('base64');
      const info = getTransactionInfo(tx);

      expect(info.sizeInBytes).toBe(500);
      expect(info.sizeLimit).toBe(1232);
      expect(info.percentUsed).toBeGreaterThan(0);
      expect(info.percentUsed).toBeLessThan(100);
    });

    test('should calculate percent used correctly', () => {
      const tx = Buffer.alloc(616).toString('base64'); // 50% of 1232
      const info = getTransactionInfo(tx);

      expect(info.percentUsed).toBe(50.0);
    });

    test('should handle max size transaction', () => {
      const tx = Buffer.alloc(1232).toString('base64');
      const info = getTransactionInfo(tx);

      expect(info.sizeInBytes).toBe(1232);
      expect(info.percentUsed).toBe(100.0);
    });

    test('should round percent to 1 decimal place', () => {
      const tx = Buffer.alloc(123).toString('base64');
      const info = getTransactionInfo(tx);

      expect(typeof info.percentUsed).toBe('number');
      expect(info.percentUsed.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
    });
  });

  describe('TRANSACTION_LIMITS', () => {
    test('should export correct constants', () => {
      expect(TRANSACTION_LIMITS.MAX_SIZE).toBe(1232);
      expect(TRANSACTION_LIMITS.WARNING_THRESHOLD).toBe(1100);
      expect(TRANSACTION_LIMITS.MAX_INSTRUCTIONS).toBe(64);
    });
  });
});
