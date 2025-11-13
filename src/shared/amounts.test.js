/**
 * Tests for amount conversion utilities with overflow protection
 */

import { describe, test, expect } from 'bun:test';
import { safeAmountToRaw, safeRawToAmount, MAX_SAFE_AMOUNTS } from './amounts.js';

describe('Amount Utils - Integer Overflow Protection', () => {
  describe('MAX_SAFE_AMOUNTS table', () => {
    test('should have entries for decimals 0-18', () => {
      for (let decimals = 0; decimals <= 18; decimals++) {
        expect(MAX_SAFE_AMOUNTS[decimals]).toBeDefined();
        expect(typeof MAX_SAFE_AMOUNTS[decimals]).toBe('number');
      }
    });

    test('should have correct value for SOL (9 decimals)', () => {
      // For 9 decimals: Number.MAX_SAFE_INTEGER / 1e9
      const expected = Number.MAX_SAFE_INTEGER / 1e9;
      expect(MAX_SAFE_AMOUNTS[9]).toBe(expected);
      // ~9 million SOL - verify order of magnitude
      expect(MAX_SAFE_AMOUNTS[9]).toBeGreaterThan(9_000_000);
      expect(MAX_SAFE_AMOUNTS[9]).toBeLessThan(10_000_000);
    });

    test('should have correct value for USDC (6 decimals)', () => {
      // For 6 decimals: Number.MAX_SAFE_INTEGER / 1e6
      const expected = Number.MAX_SAFE_INTEGER / 1e6;
      expect(MAX_SAFE_AMOUNTS[6]).toBe(expected);
      // ~9 billion USDC - verify order of magnitude
      expect(MAX_SAFE_AMOUNTS[6]).toBeGreaterThan(9_000_000_000);
      expect(MAX_SAFE_AMOUNTS[6]).toBeLessThan(10_000_000_000);
    });

    test('should have correct value for 0 decimals', () => {
      expect(MAX_SAFE_AMOUNTS[0]).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('should decrease as decimals increase', () => {
      for (let decimals = 0; decimals < 18; decimals++) {
        expect(MAX_SAFE_AMOUNTS[decimals]).toBeGreaterThan(MAX_SAFE_AMOUNTS[decimals + 1]);
      }
    });
  });

  describe('safeAmountToRaw - Valid Conversions', () => {
    test('should convert SOL amounts correctly', () => {
      expect(safeAmountToRaw(1, 9, 'SOL')).toBe(1_000_000_000);
      expect(safeAmountToRaw(0.5, 9, 'SOL')).toBe(500_000_000);
      expect(safeAmountToRaw(10, 9, 'SOL')).toBe(10_000_000_000);
      expect(safeAmountToRaw(0.000000001, 9, 'SOL')).toBe(1); // 1 lamport
    });

    test('should convert USDC amounts correctly', () => {
      expect(safeAmountToRaw(1, 6, 'USDC')).toBe(1_000_000);
      expect(safeAmountToRaw(0.5, 6, 'USDC')).toBe(500_000);
      expect(safeAmountToRaw(100, 6, 'USDC')).toBe(100_000_000);
      expect(safeAmountToRaw(0.000001, 6, 'USDC')).toBe(1); // 1 micro-USDC
    });

    test('should handle zero amount', () => {
      expect(safeAmountToRaw(0, 9, 'SOL')).toBe(0);
      expect(safeAmountToRaw(0, 6, 'USDC')).toBe(0);
      expect(safeAmountToRaw(0, 0, 'TOKEN')).toBe(0);
    });

    test('should floor fractional lamports', () => {
      // 1.9999999999 SOL = 1999999999.9 lamports -> floor to 1999999999
      expect(safeAmountToRaw(1.9999999999, 9, 'SOL')).toBe(1_999_999_999);

      // 0.5555555 USDC = 555555.5 micro-USDC -> floor to 555555
      expect(safeAmountToRaw(0.5555555, 6, 'USDC')).toBe(555_555);
    });

    test('should handle maximum safe amounts', () => {
      // Just under the limit for 9 decimals
      const maxSol = MAX_SAFE_AMOUNTS[9] - 1;
      expect(() => safeAmountToRaw(maxSol, 9, 'SOL')).not.toThrow();

      // Just under the limit for 6 decimals
      const maxUsdc = MAX_SAFE_AMOUNTS[6] - 1;
      expect(() => safeAmountToRaw(maxUsdc, 6, 'USDC')).not.toThrow();
    });

    test('should handle different decimal counts', () => {
      expect(safeAmountToRaw(1, 0, 'TOKEN')).toBe(1);
      expect(safeAmountToRaw(1, 1, 'TOKEN')).toBe(10);
      expect(safeAmountToRaw(1, 2, 'TOKEN')).toBe(100);
      expect(safeAmountToRaw(1, 3, 'TOKEN')).toBe(1_000);
      // For 18 decimals, use an amount within safe limits
      expect(safeAmountToRaw(0.001, 18, 'TOKEN')).toBe(1_000_000_000_000_000);
    });

    test('should handle small amounts correctly', () => {
      expect(safeAmountToRaw(0.001, 9, 'SOL')).toBe(1_000_000);
      expect(safeAmountToRaw(0.01, 6, 'USDC')).toBe(10_000);
      expect(safeAmountToRaw(0.1, 2, 'TOKEN')).toBe(10);
    });
  });

  describe('safeAmountToRaw - Overflow Protection', () => {
    test('should throw on amount exceeding MAX_SAFE_AMOUNTS', () => {
      const overflowSol = MAX_SAFE_AMOUNTS[9] + 1;
      expect(() => safeAmountToRaw(overflowSol, 9, 'SOL'))
        .toThrow('Amount overflow for SOL');

      const overflowUsdc = MAX_SAFE_AMOUNTS[6] + 1;
      expect(() => safeAmountToRaw(overflowUsdc, 6, 'USDC'))
        .toThrow('Amount overflow for USDC');
    });

    test('should throw on amount exactly at overflow boundary', () => {
      const exactOverflow = MAX_SAFE_AMOUNTS[9] + 0.000000001; // 1 lamport over
      expect(() => safeAmountToRaw(exactOverflow, 9, 'SOL'))
        .toThrow('Amount overflow');
    });

    test('should throw on Number.MAX_SAFE_INTEGER + 1', () => {
      // This would overflow when multiplied by any decimals
      const hugeAmount = Number.MAX_SAFE_INTEGER + 1000;
      expect(() => safeAmountToRaw(hugeAmount, 9, 'SOL'))
        .toThrow('Amount overflow');
    });

    test('should throw on extremely large amounts', () => {
      expect(() => safeAmountToRaw(1e20, 9, 'SOL')).toThrow('Amount overflow');
      expect(() => safeAmountToRaw(1e30, 6, 'USDC')).toThrow('Amount overflow');
      expect(() => safeAmountToRaw(Number.MAX_VALUE, 9, 'SOL')).toThrow('Amount overflow');
    });

    test('should include token symbol in error message', () => {
      // Test SOL - overflow for 9 decimals
      const overflowSol = MAX_SAFE_AMOUNTS[9] + 1000;
      let errorThrown = false;
      let errorMessage = '';
      try {
        safeAmountToRaw(overflowSol, 9, 'SOL');
      } catch (error) {
        errorThrown = true;
        errorMessage = error.message;
      }
      expect(errorThrown).toBe(true);
      expect(errorMessage).toContain('SOL');
      expect(errorMessage).toContain('overflow');

      // Test CUSTOM_TOKEN - overflow for 6 decimals
      const overflowUsdc = MAX_SAFE_AMOUNTS[6] + 1000;
      expect(() => safeAmountToRaw(overflowUsdc, 6, 'CUSTOM_TOKEN'))
        .toThrow(/CUSTOM_TOKEN/);
    });

    test('should throw with helpful error message showing max amount', () => {
      const overflow = MAX_SAFE_AMOUNTS[9] + 1;

      try {
        safeAmountToRaw(overflow, 9, 'SOL');
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain(MAX_SAFE_AMOUNTS[9].toString());
        expect(error.message).toContain('exceeds maximum');
      }
    });
  });

  describe('safeAmountToRaw - Edge Cases', () => {
    test('should handle negative amounts as invalid', () => {
      // Negative amounts should overflow check (they're > max safe amount check fails differently)
      // But practically they'd fail at schema validation layer
      expect(() => safeAmountToRaw(-1, 9, 'SOL')).toThrow();
    });

    test('should handle very small positive amounts', () => {
      expect(safeAmountToRaw(0.000000001, 9, 'SOL')).toBe(1);
      expect(safeAmountToRaw(0.000001, 6, 'USDC')).toBe(1);
      expect(safeAmountToRaw(Number.MIN_VALUE, 9, 'SOL')).toBe(0); // Floors to 0
    });

    test('should handle amounts that result in unsafe integers', () => {
      // This is right at the boundary where conversion becomes unsafe
      const boundaryAmount = Number.MAX_SAFE_INTEGER / 1e9 + 1;
      expect(() => safeAmountToRaw(boundaryAmount, 9, 'SOL')).toThrow();
    });

    test('should handle Infinity', () => {
      expect(() => safeAmountToRaw(Infinity, 9, 'SOL')).toThrow('Invalid amount');
      expect(() => safeAmountToRaw(-Infinity, 9, 'SOL')).toThrow('Invalid amount');
    });

    test('should handle NaN', () => {
      expect(() => safeAmountToRaw(NaN, 9, 'SOL')).toThrow();
    });

    test('should handle decimal edge cases', () => {
      // Decimals outside 0-18 would fail at schema validation but should still work
      expect(safeAmountToRaw(1, 0, 'TOKEN')).toBe(1);

      // 19 decimals would overflow more easily
      const maxFor19 = Math.floor(Number.MAX_SAFE_INTEGER / 1e19);
      expect(() => safeAmountToRaw(maxFor19 + 1, 19, 'TOKEN')).toThrow();
    });
  });

  describe('safeRawToAmount - Valid Conversions', () => {
    test('should convert SOL lamports correctly', () => {
      expect(safeRawToAmount(1_000_000_000n, 9)).toBe('1');
      expect(safeRawToAmount(500_000_000n, 9)).toBe('0.5');
      expect(safeRawToAmount(10_000_000_000n, 9)).toBe('10');
      expect(safeRawToAmount(1n, 9)).toBe('0.000000001');
    });

    test('should convert USDC micro-units correctly', () => {
      expect(safeRawToAmount(1_000_000n, 6)).toBe('1');
      expect(safeRawToAmount(500_000n, 6)).toBe('0.5');
      expect(safeRawToAmount(100_000_000n, 6)).toBe('100');
      expect(safeRawToAmount(1n, 6)).toBe('0.000001');
    });

    test('should handle zero', () => {
      expect(safeRawToAmount(0n, 9)).toBe('0');
      expect(safeRawToAmount(0n, 6)).toBe('0');
      expect(safeRawToAmount(0n, 0)).toBe('0');
    });

    test('should handle different decimal counts', () => {
      expect(safeRawToAmount(1n, 0)).toBe('1');
      expect(safeRawToAmount(10n, 1)).toBe('1');
      expect(safeRawToAmount(100n, 2)).toBe('1');
      expect(safeRawToAmount(1_000n, 3)).toBe('1');
      expect(safeRawToAmount(1_000_000_000_000_000_000n, 18)).toBe('1');
    });

    test('should preserve precision for large amounts', () => {
      // 1 million SOL
      expect(safeRawToAmount(1_000_000_000_000_000n, 9)).toBe('1000000');

      // 1 billion USDC
      expect(safeRawToAmount(1_000_000_000_000_000n, 6)).toBe('1000000000');
    });

    test('should handle amounts with many decimal places', () => {
      expect(safeRawToAmount(123456789n, 9)).toBe('0.123456789');
      expect(safeRawToAmount(123456n, 6)).toBe('0.123456');
      expect(safeRawToAmount(1n, 18)).toBe('0.000000000000000001');
    });

    test('should convert back and forth correctly', () => {
      const testCases = [
        { amount: 1, decimals: [9, 6, 2], tolerance: 0.000000001 },
        { amount: 0.5, decimals: [9, 6, 2], tolerance: 0.000000001 },
        { amount: 10, decimals: [9, 6, 2], tolerance: 0.000000001 },
        { amount: 100.123, decimals: [6, 2], tolerance: 0.01 }, // Lower decimals = more loss
        { amount: 0.01, decimals: [9, 6], tolerance: 0.000001 }
      ];

      for (const { amount, decimals, tolerance } of testCases) {
        for (const decimal of decimals) {
          const raw = safeAmountToRaw(amount, decimal, 'TEST');
          const converted = safeRawToAmount(BigInt(raw), decimal);
          const parsedBack = parseFloat(converted);

          // Should be very close (within tolerance for given decimals)
          expect(Math.abs(parsedBack - amount)).toBeLessThan(tolerance);
        }
      }
    });
  });

  describe('safeRawToAmount - Edge Cases', () => {
    test('should handle very large BigInt amounts', () => {
      // Max safe integer in lamports
      const maxLamports = BigInt(Number.MAX_SAFE_INTEGER);
      const result = safeRawToAmount(maxLamports, 9);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      // Parse back and verify it's close to expected
      const expected = Number.MAX_SAFE_INTEGER / 1e9;
      const actual = parseFloat(result);
      expect(Math.abs(actual - expected)).toBeLessThan(1); // Within 1 SOL
    });

    test('should handle amounts beyond MAX_SAFE_INTEGER', () => {
      // BigInt can handle larger numbers than Number.MAX_SAFE_INTEGER
      const huge = BigInt('999999999999999999999999999999');
      const result = safeRawToAmount(huge, 9);
      expect(result).toBeDefined();
      expect(result).toContain('999999999999999999999'); // Should preserve digits
    });

    test('should handle minimum raw amounts', () => {
      expect(safeRawToAmount(1n, 9)).toBe('0.000000001');
      expect(safeRawToAmount(1n, 18)).toBe('0.000000000000000001');
    });

    test('should return string to preserve precision', () => {
      const result = safeRawToAmount(1_000_000_000n, 9);
      expect(typeof result).toBe('string');
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle typical SOL transfer amounts', () => {
      const amounts = [0.01, 0.1, 1, 10, 100, 1000];
      for (const amount of amounts) {
        const raw = safeAmountToRaw(amount, 9, 'SOL');
        expect(raw).toBeGreaterThan(0);
        expect(Number.isSafeInteger(raw)).toBe(true);

        const back = safeRawToAmount(BigInt(raw), 9);
        expect(parseFloat(back)).toBeCloseTo(amount, 9);
      }
    });

    test('should handle typical USDC transfer amounts', () => {
      const amounts = [0.01, 1, 10, 100, 1000, 10000];
      for (const amount of amounts) {
        const raw = safeAmountToRaw(amount, 6, 'USDC');
        expect(raw).toBeGreaterThan(0);
        expect(Number.isSafeInteger(raw)).toBe(true);

        const back = safeRawToAmount(BigInt(raw), 6);
        expect(parseFloat(back)).toBeCloseTo(amount, 6);
      }
    });

    test('should reject unrealistic transfer amounts', () => {
      // Nobody should be transferring more than 9 billion SOL (more than exists)
      expect(() => safeAmountToRaw(10_000_000_000, 9, 'SOL')).toThrow();

      // Nobody should be transferring 10 quadrillion USDC
      expect(() => safeAmountToRaw(10_000_000_000_000_000, 6, 'USDC')).toThrow();
    });

    test('should handle decimal precision loss gracefully', () => {
      // 0.123456789 SOL = 123456789 lamports (no loss)
      const precise = safeAmountToRaw(0.123456789, 9, 'SOL');
      expect(precise).toBe(123456789);

      // 0.1234567899 SOL = 123456789.9 lamports -> floors to 123456789
      const floored = safeAmountToRaw(0.1234567899, 9, 'SOL');
      expect(floored).toBe(123456789);
    });

    test('should handle amounts near overflow boundary safely', () => {
      // Just under max for SOL
      const nearMax = MAX_SAFE_AMOUNTS[9] - 0.000000001;
      expect(() => safeAmountToRaw(nearMax, 9, 'SOL')).not.toThrow();

      // Just over max
      const overMax = MAX_SAFE_AMOUNTS[9] + 0.000000001;
      expect(() => safeAmountToRaw(overMax, 9, 'SOL')).toThrow();
    });
  });
});
