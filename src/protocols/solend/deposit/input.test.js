/**
 * Tests for Solend Deposit Input Preparation (prep stage)
 */

import { describe, test, expect } from 'bun:test';
import { prepareDepositInput } from './input.js';

describe('Solend Deposit - Input Preparation', () => {
  const mockReserveData = Buffer.alloc(200);
  const mockLendingMarketData = Buffer.alloc(200);

  const mockRpc = {
    getLatestBlockhash: () => ({
      send: async () => ({
        value: {
          blockhash: 'H9dECZyJVJ8AYZGqjvf3ePCgYvLn8QwPBj7K7CK5tN3M',
          lastValidBlockHeight: 200000000n
        }
      })
    }),
    getAccountInfo: (address, options) => ({
      send: async () => {
        // Return mock reserve and lending market data
        return {
          value: {
            data: [mockReserveData.toString('base64'), 'base64']
          }
        };
      }
    }),
    getMultipleAccounts: (addresses) => ({
      send: async () => {
        // Mock all ATAs as existing
        return {
          value: addresses.map(() => ({
            data: ['', 'base64']
          }))
        };
      }
    })
  };

  test('should prepare deposit with existing obligation', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        amount: '100'
      }
    };

    const result = await prepareDepositInput(input, mockRpc);

    expect(result).toHaveProperty('lifetime');
    expect(result).toHaveProperty('userUsdcAta');
    expect(result).toHaveProperty('userCusdcAta');
    expect(result).toHaveProperty('obligationAccount');
    expect(result).toHaveProperty('accounts');
    expect(result.accounts).toHaveProperty('reserve');
    expect(result.accounts).toHaveProperty('lendingMarket');
    expect(result.usdcAtaExists).toBe(true);
    expect(result.cusdcAtaExists).toBe(true);
  });

  test('should handle non-existent ATAs', async () => {
    const mockRpcNoAtas = {
      ...mockRpc,
      getMultipleAccounts: (addresses) => ({
        send: async () => {
          // Mock all ATAs as not existing
          return {
            value: addresses.map(() => null)
          };
        }
      })
    };

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        amount: '50'
      }
    };

    const result = await prepareDepositInput(input, mockRpcNoAtas);

    expect(result.usdcAtaExists).toBe(false);
    expect(result.cusdcAtaExists).toBe(false);
  });

  test('should throw error for invalid origin', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: ''
      },
      params: {
        amount: '100'
      }
    };

    await expect(prepareDepositInput(input, mockRpc)).rejects.toThrow();
  });

  test('should handle localhost origin in development', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'http://localhost:3000'
      },
      params: {
        amount: '100'
      }
    };

    const result = await prepareDepositInput(input, mockRpc);
    expect(result).toHaveProperty('lifetime');
  });

  test('should throw error when reserve account not found', async () => {
    const mockRpcNoReserve = {
      ...mockRpc,
      getAccountInfo: (address, options) => ({
        send: async () => {
          return { value: null };
        }
      })
    };

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        amount: '100'
      }
    };

    await expect(prepareDepositInput(input, mockRpcNoReserve)).rejects.toThrow('reserve account not found');
  });

  test('should include reserve and lending market account data', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        amount: '100'
      }
    };

    const result = await prepareDepositInput(input, mockRpc);

    expect(result.accounts.reserve).toHaveProperty('address');
    expect(result.accounts.reserve).toHaveProperty('data');
    expect(result.accounts.lendingMarket).toHaveProperty('address');
    expect(result.accounts.lendingMarket).toHaveProperty('data');
    expect(Array.isArray(result.accounts.reserve.data)).toBe(true);
    expect(Array.isArray(result.accounts.lendingMarket.data)).toBe(true);
  });
});
