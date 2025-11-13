/**
 * Tests for main enclave entry point
 * Validates protocol registry and transaction dispatcher
 */

import { describe, test, expect } from 'bun:test';
import { getSupportedProtocolIds, isSupportedProtocol, buildProtocolTransaction } from './enclave.js';

describe('Enclave Protocol Registry', () => {
  test('should return all supported protocol IDs', () => {
    const protocols = getSupportedProtocolIds();
    expect(protocols).toEqual(['solend', 'jupiter', 'wallet']);
  });

  test('should identify supported protocols', () => {
    expect(isSupportedProtocol('solend')).toBe(true);
    expect(isSupportedProtocol('jupiter')).toBe(true);
    expect(isSupportedProtocol('wallet')).toBe(true);
  });

  test('should reject unsupported protocols', () => {
    expect(isSupportedProtocol('unknown')).toBe(false);
    expect(isSupportedProtocol('marinade')).toBe(false);
    expect(isSupportedProtocol('')).toBe(false);
  });

  test('should throw error for unsupported protocol in buildProtocolTransaction', async () => {
    expect(async () => {
      await buildProtocolTransaction({
        protocol: 'unsupported',
        context: { wallet: 'test', origin: 'https://test.com' },
        params: {},
        prepared: {}
      });
    }).toThrow('Unsupported protocol: unsupported');
  });
});

describe('Enclave Transaction Dispatcher', () => {
  test('should dispatch to solend builder', async () => {
    const mockContext = {
      wallet: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
      origin: 'https://test.com'
    };

    const mockPrepared = {
      lifetime: {
        blockhash: '9PCqHaWG7AFp2C9BfF7AqFb9Tz1PyoMaYB5jGBuGznmL',
        lastValidBlockHeight: '300000000'
      },
      userUsdcAta: 'AafH7fTHYDMbdJ6b4i4dMvfZ4k5mHB6cMwrQAQVcLtDM',
      userCusdcAta: '9XJzYc5VnDaVbZKdMVrCJa8V4JbJvf8f6PGXeZ5F1234',
      usdcAtaExists: true,
      cusdcAtaExists: true,
      obligationAccount: '5ZxV5HJT9k9YQaYb9qGUFbZz9vFKZb1G5bQGHJ5K1234',
      obligationExists: true,
      accounts: {
        reserve: {
          address: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
          data: new Array(600).fill(0)
        },
        lendingMarket: {
          address: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
          data: new Array(200).fill(0)
        }
      }
    };

    const result = await buildProtocolTransaction({
      protocol: 'solend',
      context: mockContext,
      params: { operation: 'deposit', amount: 1_000_000 },
      prepared: mockPrepared
    });

    expect(result).toHaveProperty('wireTransaction');
    expect(result).toHaveProperty('deposit');
    expect(result.deposit.tokenSymbol).toBe('USDC');
  });

  test('should dispatch to jupiter builder', async () => {
    const mockContext = {
      wallet: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
      origin: 'https://test.com'
    };

    const mockPrepared = {
      transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDAgAADA==',
      route: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: '1000000',
        outAmount: '150000',
        priceImpactPct: '0.001',
        slippageBps: 50,
        marketInfos: []
      },
      fees: {
        signatureFeeLamports: 5000,
        prioritizationFeeLamports: 100000,
        rentFeeLamports: 0,
        feeBps: 2
      },
      router: 'jupiter',
      requestId: 'test-request-id'
    };

    const result = await buildProtocolTransaction({
      protocol: 'jupiter',
      context: mockContext,
      params: { operation: 'swap' },
      prepared: mockPrepared
    });

    expect(result).toHaveProperty('wireTransaction');
    expect(result).toHaveProperty('swap');
    expect(result.swap.router).toBe('jupiter');
  });

  test('should dispatch to wallet builder', async () => {
    const mockContext = {
      wallet: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
      origin: 'https://test.com'
    };

    const mockPrepared = {
      lifetime: {
        blockhash: '9PCqHaWG7AFp2C9BfF7AqFb9Tz1PyoMaYB5jGBuGznmL',
        lastValidBlockHeight: '300000000'
      }
    };

    const result = await buildProtocolTransaction({
      protocol: 'wallet',
      context: mockContext,
      params: {
        operation: 'transfer',
        recipient: '9PCqHaWG7AFp2C9BfF7AqFb9Tz1PyoMaYB5jGBuGznmL',
        amount: 1.0
      },
      prepared: mockPrepared
    });

    expect(result).toHaveProperty('wireTransaction');
    expect(result).toHaveProperty('transfer');
    expect(result.transfer.symbol).toBe('SOL');
  });
});
