/**
 * Tests for Solend account parsers with buffer overflow protection
 */

import { describe, test, expect } from 'bun:test';
import { parseReserveAccount, parseLendingMarketAccount } from './parser.js';

describe('Solend Parser - Buffer Overflow Protection', () => {
  describe('parseReserveAccount', () => {
    test('should throw on null buffer', () => {
      expect(() => parseReserveAccount(null)).toThrow('Invalid reserve account data');
    });

    test('should throw on undefined buffer', () => {
      expect(() => parseReserveAccount(undefined)).toThrow('Invalid reserve account data');
    });

    test('should throw on non-Buffer input', () => {
      expect(() => parseReserveAccount('not a buffer')).toThrow('Invalid reserve account data');
      expect(() => parseReserveAccount({})).toThrow('Invalid reserve account data');
      expect(() => parseReserveAccount([])).toThrow('Invalid reserve account data');
      expect(() => parseReserveAccount(123)).toThrow('Invalid reserve account data');
    });

    test('should throw on buffer too small', () => {
      const tooSmall = Buffer.alloc(100); // Minimum is 619 bytes
      expect(() => parseReserveAccount(tooSmall)).toThrow('Invalid reserve account data');
    });

    test('should throw on buffer at minimum boundary - 1', () => {
      const almostMin = Buffer.alloc(618);
      expect(() => parseReserveAccount(almostMin)).toThrow('Invalid reserve account data');
    });

    test('should parse buffer at exact minimum size', () => {
      const minBuffer = Buffer.alloc(619);
      // Version at offset 0
      minBuffer.writeUInt8(1, 0);

      const result = parseReserveAccount(minBuffer);
      expect(result).toBeDefined();
      expect(result.version).toBe(1);
      expect(result.liquiditySupplyPubkey).toBeDefined();
      expect(result.collateralMintPubkey).toBeDefined();
    });

    test('should parse larger valid buffer', () => {
      const largeBuffer = Buffer.alloc(1000);
      largeBuffer.writeUInt8(1, 0);

      const result = parseReserveAccount(largeBuffer);
      expect(result).toBeDefined();
      expect(result.version).toBe(1);
    });

    test('should extract correct liquidity supply address', () => {
      const buffer = Buffer.alloc(619);
      buffer.writeUInt8(1, 0);

      // Write a recognizable pattern at liquidity supply offset (74-106)
      const testBytes = Buffer.from([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
      ]);
      testBytes.copy(buffer, 74);

      const result = parseReserveAccount(buffer);
      expect(result.liquiditySupplyPubkey).toBeDefined();
      expect(Buffer.isBuffer(result.liquiditySupplyPubkey)).toBe(true);
      expect(result.liquiditySupplyPubkey.length).toBe(32);

      // Verify the pattern was read correctly
      for (let i = 0; i < 32; i++) {
        expect(result.liquiditySupplyPubkey[i]).toBe(i + 1);
      }
    });

    test('should extract correct collateral mint address', () => {
      const buffer = Buffer.alloc(619);
      buffer.writeUInt8(1, 0);

      // Write a recognizable pattern at collateral mint offset (221-253)
      const testBytes = Buffer.from([
        33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
        49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64
      ]);
      testBytes.copy(buffer, 221);

      const result = parseReserveAccount(buffer);
      expect(result.collateralMintPubkey).toBeDefined();
      expect(Buffer.isBuffer(result.collateralMintPubkey)).toBe(true);
      expect(result.collateralMintPubkey.length).toBe(32);

      // Verify the pattern was read correctly
      for (let i = 0; i < 32; i++) {
        expect(result.collateralMintPubkey[i]).toBe(33 + i);
      }
    });

    test('should handle different version numbers', () => {
      const buffer = Buffer.alloc(619);

      // Version 0
      buffer.writeUInt8(0, 0);
      let result = parseReserveAccount(buffer);
      expect(result.version).toBe(0);

      // Version 1
      buffer.writeUInt8(1, 0);
      result = parseReserveAccount(buffer);
      expect(result.version).toBe(1);

      // Version 255
      buffer.writeUInt8(255, 0);
      result = parseReserveAccount(buffer);
      expect(result.version).toBe(255);
    });

    test('should not read beyond buffer bounds', () => {
      // Create buffer that's exactly minimum size
      const exactBuffer = Buffer.alloc(619);
      exactBuffer.writeUInt8(1, 0);

      // Should successfully parse without reading beyond bounds
      const result = parseReserveAccount(exactBuffer);
      expect(result).toBeDefined();

      // Verify no out-of-bounds access occurred by checking result structure
      expect(result.version).toBeDefined();
      expect(result.liquiditySupplyPubkey).toBeDefined();
      expect(result.collateralMintPubkey).toBeDefined();
    });
  });

  describe('parseLendingMarketAccount', () => {
    test('should throw on null buffer', () => {
      expect(() => parseLendingMarketAccount(null)).toThrow('Invalid lending market account data');
    });

    test('should throw on undefined buffer', () => {
      expect(() => parseLendingMarketAccount(undefined)).toThrow('Invalid lending market account data');
    });

    test('should throw on non-Buffer input', () => {
      expect(() => parseLendingMarketAccount('not a buffer')).toThrow('Invalid lending market account data');
      expect(() => parseLendingMarketAccount({})).toThrow('Invalid lending market account data');
      expect(() => parseLendingMarketAccount([])).toThrow('Invalid lending market account data');
    });

    test('should throw on buffer too small', () => {
      const tooSmall = Buffer.alloc(100); // Minimum is 258 bytes
      expect(() => parseLendingMarketAccount(tooSmall)).toThrow('Invalid lending market account data');
    });

    test('should throw on buffer at minimum boundary - 1', () => {
      const almostMin = Buffer.alloc(257);
      expect(() => parseLendingMarketAccount(almostMin)).toThrow('Invalid lending market account data');
    });

    test('should parse buffer at exact minimum size', () => {
      const minBuffer = Buffer.alloc(258);
      // Version at offset 0
      minBuffer.writeUInt8(1, 0);

      const result = parseLendingMarketAccount(minBuffer);
      expect(result).toBeDefined();
      expect(result.version).toBe(1);
      expect(result.owner).toBeDefined();
      expect(result.bumpSeed).toBeDefined();
    });

    test('should parse larger valid buffer', () => {
      const largeBuffer = Buffer.alloc(500);
      largeBuffer.writeUInt8(1, 0);

      const result = parseLendingMarketAccount(largeBuffer);
      expect(result).toBeDefined();
      expect(result.version).toBe(1);
    });

    test('should extract correct owner address', () => {
      const buffer = Buffer.alloc(258);
      buffer.writeUInt8(1, 0);
      buffer.writeUInt8(255, 1); // bumpSeed

      // Write a recognizable pattern at owner offset (2-34)
      const testBytes = Buffer.from([
        65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
        81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96
      ]);
      testBytes.copy(buffer, 2);

      const result = parseLendingMarketAccount(buffer);
      expect(result.owner).toBeDefined();
      expect(Buffer.isBuffer(result.owner)).toBe(true);
      expect(result.owner.length).toBe(32);

      // Verify the pattern was read correctly
      for (let i = 0; i < 32; i++) {
        expect(result.owner[i]).toBe(65 + i);
      }
    });

    test('should extract correct bumpSeed', () => {
      const buffer = Buffer.alloc(258);
      buffer.writeUInt8(1, 0);   // version
      buffer.writeUInt8(123, 1); // bumpSeed

      const result = parseLendingMarketAccount(buffer);
      expect(result.bumpSeed).toBe(123);
    });

    test('should handle different version numbers', () => {
      const buffer = Buffer.alloc(258);

      // Version 0
      buffer.writeUInt8(0, 0);
      let result = parseLendingMarketAccount(buffer);
      expect(result.version).toBe(0);

      // Version 1
      buffer.writeUInt8(1, 0);
      result = parseLendingMarketAccount(buffer);
      expect(result.version).toBe(1);

      // Version 255
      buffer.writeUInt8(255, 0);
      result = parseLendingMarketAccount(buffer);
      expect(result.version).toBe(255);
    });

    test('should not read beyond buffer bounds', () => {
      // Create buffer that's exactly minimum size
      const exactBuffer = Buffer.alloc(258);
      exactBuffer.writeUInt8(1, 0);

      // Should successfully parse without reading beyond bounds
      const result = parseLendingMarketAccount(exactBuffer);
      expect(result).toBeDefined();

      // Verify no out-of-bounds access occurred
      expect(result.version).toBeDefined();
      expect(result.owner).toBeDefined();
      expect(result.bumpSeed).toBeDefined();
    });
  });

  describe('Edge Cases and Security', () => {
    test('parseReserveAccount - should handle zero-filled buffer', () => {
      const zeroBuffer = Buffer.alloc(619);
      const result = parseReserveAccount(zeroBuffer);

      expect(result.version).toBe(0);
      // Verify all bytes in extracted fields are zero
      expect(result.liquiditySupplyPubkey.every(byte => byte === 0)).toBe(true);
      expect(result.collateralMintPubkey.every(byte => byte === 0)).toBe(true);
    });

    test('parseLendingMarketAccount - should handle zero-filled buffer', () => {
      const zeroBuffer = Buffer.alloc(258);
      const result = parseLendingMarketAccount(zeroBuffer);

      expect(result.version).toBe(0);
      expect(result.bumpSeed).toBe(0);
      expect(result.owner.every(byte => byte === 0)).toBe(true);
    });

    test('parseReserveAccount - should handle max-filled buffer', () => {
      const maxBuffer = Buffer.alloc(619, 0xFF);
      const result = parseReserveAccount(maxBuffer);

      expect(result.version).toBe(255);
      expect(result.liquiditySupplyPubkey.every(byte => byte === 255)).toBe(true);
      expect(result.collateralMintPubkey.every(byte => byte === 255)).toBe(true);
    });

    test('parseLendingMarketAccount - should handle max-filled buffer', () => {
      const maxBuffer = Buffer.alloc(258, 0xFF);
      const result = parseLendingMarketAccount(maxBuffer);

      expect(result.version).toBe(255);
      expect(result.bumpSeed).toBe(255);
      expect(result.owner.every(byte => byte === 255)).toBe(true);
    });

    test('should handle very large buffers efficiently', () => {
      // Simulate real on-chain account data which might be larger
      const largeBuffer = Buffer.alloc(10000);
      largeBuffer.writeUInt8(1, 0);

      const startReserve = performance.now();
      const resultReserve = parseReserveAccount(largeBuffer);
      const timeReserve = performance.now() - startReserve;

      expect(resultReserve).toBeDefined();
      expect(timeReserve).toBeLessThan(10); // Should parse in < 10ms

      const largeLMBuffer = Buffer.alloc(10000);
      largeLMBuffer.writeUInt8(1, 0);

      const startLM = performance.now();
      const resultLM = parseLendingMarketAccount(largeLMBuffer);
      const timeLM = performance.now() - startLM;

      expect(resultLM).toBeDefined();
      expect(timeLM).toBeLessThan(10); // Should parse in < 10ms
    });
  });
});
