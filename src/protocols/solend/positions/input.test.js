/**
 * Tests for Solend Positions Query (prep stage)
 */

import { describe, test, expect } from 'bun:test';
import { preparePositionsInput } from './input.js';

describe('Solend Positions - Query Execution', () => {
  // Create a mock obligation account with 100 USDC deposited
  function createMockObligationData(depositAmount = 100_000_000n) {
    const data = Buffer.alloc(400);

    // Write deposits array length at offset 202 (uint16)
    data.writeUInt16LE(1, 202);

    // Write deposit amount at offset 204 + 32 = 236 (BigUInt64LE)
    data.writeBigUInt64LE(depositAmount, 236);

    return data;
  }

  test('should fetch positions for wallet with deposits', async () => {
    const obligationData = createMockObligationData(100_000_000n);

    const mockRpc = {
      getAccountInfo: (address, options) => ({
        send: async () => {
          return {
            value: {
              data: [obligationData.toString('base64'), 'base64']
            }
          };
        }
      })
    };

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {}
    };

    const result = await preparePositionsInput(input, mockRpc);

    expect(result.exists).toBe(true);
    expect(result.depositedUSDC).toBe('100');
    expect(result.depositedRaw).toBe(100_000_000);
    expect(result).toHaveProperty('obligation');
    expect(result).toHaveProperty('deposits');
  });

  test('should return zero balance for wallet without obligation', async () => {
    const mockRpc = {
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
      params: {}
    };

    const result = await preparePositionsInput(input, mockRpc);

    expect(result.exists).toBe(false);
    expect(result.depositedUSDC).toBe('0');
    expect(result.depositedRaw).toBe(0);
  });

  test('should handle obligation with zero deposits', async () => {
    const obligationData = createMockObligationData(0n);

    const mockRpc = {
      getAccountInfo: (address, options) => ({
        send: async () => {
          return {
            value: {
              data: [obligationData.toString('base64'), 'base64']
            }
          };
        }
      })
    };

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {}
    };

    const result = await preparePositionsInput(input, mockRpc);

    expect(result.exists).toBe(true);
    expect(result.depositedUSDC).toBe('0');
    expect(result.depositedRaw).toBe(0);
  });

  test('should throw error for invalid origin', async () => {
    const mockRpc = {
      getAccountInfo: (address, options) => ({
        send: async () => {
          return { value: null };
        }
      })
    };

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: ''
      },
      params: {}
    };

    await expect(preparePositionsInput(input, mockRpc)).rejects.toThrow();
  });

  test('should handle localhost origin in development', async () => {
    const mockRpc = {
      getAccountInfo: (address, options) => ({
        send: async () => {
          return { value: null };
        }
      })
    };

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'http://localhost:3000'
      },
      params: {}
    };

    const result = await preparePositionsInput(input, mockRpc);
    expect(result.exists).toBe(false);
  });

  test('should handle malformed obligation data', async () => {
    // Create buffer that's too small
    const obligationData = Buffer.alloc(100);

    const mockRpc = {
      getAccountInfo: (address, options) => ({
        send: async () => {
          return {
            value: {
              data: [obligationData.toString('base64'), 'base64']
            }
          };
        }
      })
    };

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {}
    };

    const result = await preparePositionsInput(input, mockRpc);

    // Should return zero balance rather than throwing
    expect(result.depositedUSDC).toBe('0');
  });
});
