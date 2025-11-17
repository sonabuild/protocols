/**
 * Tests for Jupiter Swap Input Preparation (prep stage)
 */

import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { prepareSwapInput } from './input.js';

describe('Jupiter Swap - Input Preparation', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

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

  const mockJupiterResponse = {
    transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAo=',
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    inAmount: '1000000000',
    outAmount: '50000000',
    priceImpactPct: 0.05,
    slippageBps: 50,
    requestId: 'req-123',
    router: 'Jupiter Ultra',
    swapType: 'ExactIn',
    routePlan: [{
      ammKey: 'pool-abc',
      label: 'Orca',
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      inAmount: '1000000000',
      outAmount: '50000000',
      percent: 100
    }],
    signatureFeeLamports: 5000,
    prioritizationFeeLamports: 10000,
    rentFeeLamports: 0,
    feeBps: 20,
    platformFee: null
  };

  test('should prepare swap with valid Jupiter API response', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => mockJupiterResponse,
      text: async () => JSON.stringify(mockJupiterResponse)
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0,
        slippageBps: 50
      }
    };

    const result = await prepareSwapInput(input, mockRpc);

    expect(result).toHaveProperty('lifetime');
    expect(result).toHaveProperty('userInputAta');
    expect(result).toHaveProperty('userOutputAta');
    expect(result).toHaveProperty('route');
    expect(result).toHaveProperty('transaction');
    expect(result.route.inputMint).toBe('So11111111111111111111111111111111111111112');
    expect(result.route.outputMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(result.fees.signatureFeeLamports).toBe(5000);
  });

  test('should use default slippageBps of 50 when not provided', async () => {
    globalThis.fetch = mock(async (url) => {
      expect(url.includes('slippageBps=50')).toBe(true);
      return {
        ok: true,
        json: async () => mockJupiterResponse,
        text: async () => JSON.stringify(mockJupiterResponse)
      };
    });

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    await prepareSwapInput(input, mockRpc);
  });

  test('should throw error for Jupiter API error response', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        error: 'Insufficient liquidity'
      }),
      text: async () => JSON.stringify({ error: 'Insufficient liquidity' })
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    await expect(prepareSwapInput(input, mockRpc)).rejects.toThrow('Jupiter order error');
  });

  test('should throw error for insufficient funds (errorCode 1)', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        errorCode: 1
      }),
      text: async () => JSON.stringify({ errorCode: 1 })
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    await expect(prepareSwapInput(input, mockRpc)).rejects.toThrow('Insufficient funds for swap');
  });

  test('should throw error for insufficient SOL (errorCode 2)', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        errorCode: 2
      }),
      text: async () => JSON.stringify({ errorCode: 2 })
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    await expect(prepareSwapInput(input, mockRpc)).rejects.toThrow('Top up SOL for gas fees');
  });

  test('should throw error for minimum swap amount not met (errorCode 3)', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        errorCode: 3
      }),
      text: async () => JSON.stringify({ errorCode: 3 })
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 0.000001
      }
    };

    await expect(prepareSwapInput(input, mockRpc)).rejects.toThrow('Minimum swap amount not met');
  });

  test('should throw error for invalid transaction format', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        transaction: ''
      }),
      text: async () => JSON.stringify({ transaction: '' })
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    await expect(prepareSwapInput(input, mockRpc)).rejects.toThrow('No transaction returned');
  });

  test('should throw error for transaction too small', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        transaction: 'YQ==' // 'a' in base64 (1 byte)
      }),
      text: async () => JSON.stringify({ transaction: 'YQ==' })
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    await expect(prepareSwapInput(input, mockRpc)).rejects.toThrow('Transaction too small');
  });

  test('should throw error for invalid origin', async () => {
    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: ''
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    await expect(prepareSwapInput(input, mockRpc)).rejects.toThrow();
  });

  test('should handle localhost origin in development', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => mockJupiterResponse,
      text: async () => JSON.stringify(mockJupiterResponse)
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'http://localhost:3000'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    const result = await prepareSwapInput(input, mockRpc);
    expect(result).toHaveProperty('lifetime');
  });

  test('should throw error for invalid base64 transaction', async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      json: async () => ({
        transaction: 'not-valid-base64!!!!'
      }),
      text: async () => JSON.stringify({ transaction: 'not-valid-base64!!!!' })
    }));

    const input = {
      context: {
        wallet: 'D4QKSBbJbT3e8dR7bVyT3n2qDnKZH5jz5GvNzF6xvY1m',
        origin: 'https://sona.build'
      },
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.0
      }
    };

    await expect(prepareSwapInput(input, mockRpc)).rejects.toThrow('Transaction too small');
  });
});
