/**
 * Tests for Wallet Transfer Input Preparation (prep stage)
 */

import { describe, test, expect, mock } from 'bun:test';
import { prepareTransferInput } from './input.js';
import { address } from '@solana/addresses';

describe('Wallet Transfer - Input Preparation', () => {
  const mockRpc = {
    getLatestBlockhash: () => ({
      send: async () => ({
        value: {
          blockhash: 'H9dECZyJVJ8AYZGqjvf3ePCgYvLn8QwPBj7K7CK5tN3M',
          lastValidBlockHeight: 200000000n
        }
      })
    })
  };

  test('should prepare SOL transfer (no mint/symbol)', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        recipient: '8xKZ4QW8vXCvQJH8zK1pF3wR5gNjB2mCfQ7x9Y3vN1h',
        amount: '1.5'
      }
    };

    const result = await prepareTransferInput(input, mockRpc);

    expect(result).toHaveProperty('lifetime');
    expect(result.lifetime.blockhash).toBe('H9dECZyJVJ8AYZGqjvf3ePCgYvLn8QwPBj7K7CK5tN3M');
    expect(result.lifetime.lastValidBlockHeight).toBe(200000000n);
    expect(result.senderTokenAccount).toBeUndefined();
    expect(result.recipientTokenAccount).toBeUndefined();
  });

  test('should prepare SOL transfer when symbol=SOL', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        recipient: '8xKZ4QW8vXCvQJH8zK1pF3wR5gNjB2mCfQ7x9Y3vN1h',
        amount: '1.0',
        symbol: 'SOL'
      }
    };

    const result = await prepareTransferInput(input, mockRpc);

    expect(result).toHaveProperty('lifetime');
    expect(result.senderTokenAccount).toBeUndefined();
    expect(result.recipientTokenAccount).toBeUndefined();
  });

  test('should prepare SPL token transfer with mint address', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        recipient: '8xKZ4QW8vXCvQJH8zK1pF3wR5gNjB2mCfQ7x9Y3vN1h',
        amount: '100',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
      }
    };

    const result = await prepareTransferInput(input, mockRpc);

    expect(result).toHaveProperty('lifetime');
    expect(result).toHaveProperty('senderTokenAccount');
    expect(result).toHaveProperty('recipientTokenAccount');
    expect(typeof result.senderTokenAccount).toBe('string');
    expect(typeof result.recipientTokenAccount).toBe('string');
  });

  test('should prepare SPL token transfer with symbol', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        recipient: '8xKZ4QW8vXCvQJH8zK1pF3wR5gNjB2mCfQ7x9Y3vN1h',
        amount: '50',
        symbol: 'USDC'
      }
    };

    const result = await prepareTransferInput(input, mockRpc);

    expect(result).toHaveProperty('lifetime');
    expect(result).toHaveProperty('senderTokenAccount');
    expect(result).toHaveProperty('recipientTokenAccount');
    expect(typeof result.senderTokenAccount).toBe('string');
    expect(typeof result.recipientTokenAccount).toBe('string');
  });

  test('should throw error for invalid origin', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: '' // Invalid origin
      },
      params: {
        recipient: '8xKZ4QW8vXCvQJH8zK1pF3wR5gNjB2mCfQ7x9Y3vN1h',
        amount: '1.0'
      }
    };

    await expect(prepareTransferInput(input, mockRpc)).rejects.toThrow();
  });

  test('should handle localhost origin in development', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'http://localhost:3000'
      },
      params: {
        recipient: '8xKZ4QW8vXCvQJH8zK1pF3wR5gNjB2mCfQ7x9Y3vN1h',
        amount: '0.5'
      }
    };

    // Should not throw (localhost is allowed with warning)
    const result = await prepareTransferInput(input, mockRpc);
    expect(result).toHaveProperty('lifetime');
  });
});
