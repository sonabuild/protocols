/**
 * Zod Schema Primitives Tests
 *
 * Unit tests for Solana-specific Zod validation schemas
 */

import { describe, test, expect } from 'bun:test';
import {
  SolanaAddress,
  TokenAmount,
  WireTransaction,
  BlockhashLifetime
} from './schemas.js';

describe('SolanaAddress', () => {
  test('should validate valid Solana address', () => {
    const validAddresses = [
      '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      '11111111111111111111111111111111',
      'So11111111111111111111111111111111111111112',
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    ];

    for (const address of validAddresses) {
      const result = SolanaAddress.safeParse(address);
      expect(result.success).toBe(true);
    }
  });

  test('should reject invalid Base58 characters', () => {
    const invalidAddresses = [
      '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR0e',  // Contains '0' (not Base58)
      '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqROe',  // Contains 'O' (not Base58)
      '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqRIe',  // Contains 'I' (not Base58)
      '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqRle'   // Contains 'l' (not Base58)
    ];

    for (const address of invalidAddresses) {
      const result = SolanaAddress.safeParse(address);
      expect(result.success).toBe(false);
    }
  });

  test('should reject address that is too short', () => {
    const result = SolanaAddress.safeParse('short');
    expect(result.success).toBe(false);
  });

  test('should reject address that is too long', () => {
    const result = SolanaAddress.safeParse('1'.repeat(45));
    expect(result.success).toBe(false);
  });

  test('should reject address with wrong byte length', () => {
    // Valid Base58 but not 32 bytes when decoded
    const result = SolanaAddress.safeParse('1'.repeat(35));
    expect(result.success).toBe(false);
  });
});

describe('TokenAmount', () => {
  const USDC_DECIMALS = 6;
  const USDC_MIN = 1000;        // 0.001 USDC
  const USDC_MAX = 1_000_000_000_000;  // 1M USDC

  const USDCAmount = TokenAmount(USDC_DECIMALS, 'USDC', USDC_MIN, USDC_MAX);

  test('should validate valid USDC amounts', () => {
    const validAmounts = [
      1000,          // 0.001 USDC (minimum)
      1_000_000,     // 1 USDC
      100_000_000,   // 100 USDC
      1_000_000_000_000  // 1M USDC (maximum)
    ];

    for (const amount of validAmounts) {
      const result = USDCAmount.safeParse(amount);
      expect(result.success).toBe(true);
    }
  });

  test('should reject amount below minimum', () => {
    const result = USDCAmount.safeParse(500);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('at least 1000 lamports');
  });

  test('should reject amount above maximum', () => {
    const result = USDCAmount.safeParse(2_000_000_000_000);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('cannot exceed');
  });

  test('should reject non-integer amounts', () => {
    const result = USDCAmount.safeParse(1000.5);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('integer');
  });

  test('should include token symbol in error messages', () => {
    const result = USDCAmount.safeParse(500);
    expect(result.error.issues[0].message).toContain('USDC');
  });

  test('should work with different token decimals (SOL)', () => {
    const SOL_DECIMALS = 9;
    const SOL_MIN = 1_000_000;  // 0.001 SOL
    const SOL_MAX = 1_000_000_000_000;  // 1000 SOL

    const SOLAmount = TokenAmount(SOL_DECIMALS, 'SOL', SOL_MIN, SOL_MAX);

    const result = SOLAmount.safeParse(500_000_000);  // 0.5 SOL
    expect(result.success).toBe(true);
  });
});

describe('WireTransaction', () => {
  test('should validate valid Base64 transaction', () => {
    const validTransactions = [
      'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
      Buffer.from('test transaction').toString('base64'),
      'AQABCg==',
      'dGVzdA=='
    ];

    for (const tx of validTransactions) {
      const result = WireTransaction.safeParse(tx);
      expect(result.success).toBe(true);
    }
  });

  test('should reject empty transaction', () => {
    const result = WireTransaction.safeParse('');
    expect(result.success).toBe(false);
  });

  test('should reject non-string transaction', () => {
    const result = WireTransaction.safeParse(null);
    expect(result.success).toBe(false);
  });
});

describe('BlockhashLifetime', () => {
  test('should validate valid blockhash lifetime', () => {
    const valid = {
      blockhash: '1'.repeat(44),
      lastValidBlockHeight: 123456789n
    };

    const result = BlockhashLifetime.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test('should reject invalid blockhash format', () => {
    const invalid = {
      blockhash: 'short',
      lastValidBlockHeight: 123456789n
    };

    const result = BlockhashLifetime.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('should reject non-bigint lastValidBlockHeight', () => {
    const invalid = {
      blockhash: '1'.repeat(44),
      lastValidBlockHeight: 123456789
    };

    const result = BlockhashLifetime.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('should reject blockhash with invalid Base58', () => {
    const invalid = {
      blockhash: '0'.repeat(44),  // Contains '0' which is not Base58
      lastValidBlockHeight: 123456789n
    };

    const result = BlockhashLifetime.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('should reject missing fields', () => {
    const invalid = {
      blockhash: '1'.repeat(44)
      // Missing lastValidBlockHeight
    };

    const result = BlockhashLifetime.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
