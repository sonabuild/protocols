/**
 * Tests for Solend Withdraw Input Preparation (prep stage)
 */

import { describe, test, expect } from 'bun:test';
import { prepareWithdrawInput } from './input.js';

describe('Solend Withdraw - Input Preparation', () => {
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
        return {
          value: {
            data: [mockReserveData.toString('base64'), 'base64']
          }
        };
      }
    }),
    getMultipleAccounts: (addresses) => ({
      send: async () => {
        return {
          value: addresses.map(() => ({
            data: ['', 'base64']
          }))
        };
      }
    })
  };

  test('should prepare withdraw with existing accounts', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        amount: '50'
      }
    };

    const result = await prepareWithdrawInput(input, mockRpc);

    expect(result).toHaveProperty('lifetime');
    expect(result).toHaveProperty('userUsdcAta');
    expect(result).toHaveProperty('userCusdcAta');
    expect(result).toHaveProperty('obligationAccount');
    expect(result).toHaveProperty('accounts');
    expect(result.accounts).toHaveProperty('reserve');
    expect(result.accounts).toHaveProperty('lendingMarket');
  });

  test('should throw error for invalid origin', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: ''
      },
      params: {
        amount: '50'
      }
    };

    await expect(prepareWithdrawInput(input, mockRpc)).rejects.toThrow();
  });

  test('should handle localhost origin in development', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'http://localhost:3000'
      },
      params: {
        amount: '50'
      }
    };

    const result = await prepareWithdrawInput(input, mockRpc);
    expect(result).toHaveProperty('lifetime');
  });
});
