/**
 * Tests for Wallet Balance Query (prep stage)
 */

import { describe, test, expect } from 'bun:test';
import { prepareBalanceInput } from './input.js';

describe('Wallet Balance - Query Execution', () => {
  const mockRpc = {
    getBalance: (owner) => ({
      send: async () => ({
        value: 5000000000n // 5 SOL in lamports
      })
    }),
    getTokenAccountsByOwner: (owner, filter, config) => ({
      send: async () => {
        // Mock USDC account
        if (filter.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
          return {
            value: [{
              account: {
                data: {
                  parsed: {
                    info: {
                      tokenAmount: {
                        uiAmountString: '100.50',
                        amount: '100500000', // 100.50 USDC (6 decimals)
                        decimals: 6
                      }
                    }
                  }
                }
              }
            }]
          };
        }
        // No account found for other tokens
        return { value: [] };
      }
    })
  };

  test('should fetch SOL balance', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        symbols: ['SOL']
      }
    };

    const result = await prepareBalanceInput(input, mockRpc);

    expect(result.symbol).toBe('SOL');
    expect(result.amount).toBe('5');
    expect(result.amountRaw).toBe('5000000000');
    expect(result.decimals).toBe(9);
  });

  test('should fetch USDC balance', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        symbols: ['USDC']
      }
    };

    const result = await prepareBalanceInput(input, mockRpc);

    expect(result.symbol).toBe('USDC');
    expect(result.mint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(result.amount).toBe('100.50');
    expect(result.amountRaw).toBe('100500000');
    expect(result.decimals).toBe(6);
  });

  test('should return zero balance for non-existent token account', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        symbols: ['USDT']
      }
    };

    const result = await prepareBalanceInput(input, mockRpc);

    expect(result.symbol).toBe('USDT');
    expect(result.amount).toBe('0');
    expect(result.amountRaw).toBe('0');
    expect(result.decimals).toBe(6);
  });

  test('should fetch multiple token balances', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        symbols: ['SOL', 'USDC']
      }
    };

    const result = await prepareBalanceInput(input, mockRpc);

    expect(result).toHaveProperty('SOL');
    expect(result).toHaveProperty('USDC');
    expect(result.SOL.amount).toBe('5');
    expect(result.USDC.amount).toBe('100.50');
  });

  test('should fetch all supported tokens when no symbols provided', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {}
    };

    const result = await prepareBalanceInput(input, mockRpc);

    // Should have balances for all supported tokens
    expect(result).toHaveProperty('SOL');
    expect(result).toHaveProperty('USDC');
    expect(result).toHaveProperty('USDT');
  });

  test('should throw error for invalid origin', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: '' // Invalid origin
      },
      params: {
        symbols: ['SOL']
      }
    };

    await expect(prepareBalanceInput(input, mockRpc)).rejects.toThrow();
  });

  test('should handle localhost origin in development', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'http://localhost:3000'
      },
      params: {
        symbols: ['SOL']
      }
    };

    // Should not throw (localhost is allowed with warning)
    const result = await prepareBalanceInput(input, mockRpc);
    expect(result.symbol).toBe('SOL');
  });

  test('should handle errors fetching specific token balance', async () => {
    const errorRpc = {
      getBalance: () => ({
        send: async () => {
          throw new Error('RPC error');
        }
      }),
      getTokenAccountsByOwner: () => ({
        send: async () => {
          throw new Error('RPC error');
        }
      })
    };

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        symbols: ['SOL', 'USDC']
      }
    };

    // Should not throw - errors are logged and skipped
    const result = await prepareBalanceInput(input, errorRpc);

    // Result should be empty object (all tokens failed)
    expect(Object.keys(result).length).toBe(0);
  });
});
