import { describe, test, expect } from 'bun:test';
import { buildProtocolTransaction, isSupportedProtocol, getSupportedProtocolIds } from '../../../enclave.js';

describe('Jupiter Enclave Registration', () => {
  test('should register Jupiter as a supported protocol', () => {
    const protocols = getSupportedProtocolIds();

    expect(protocols).toContain('jupiter');
    expect(protocols).toContain('solend');
  });

  test('should recognize Jupiter as supported', () => {
    expect(isSupportedProtocol('jupiter')).toBe(true);
    expect(isSupportedProtocol('solend')).toBe(true);
    expect(isSupportedProtocol('invalid')).toBe(false);
  });

  test('should build Jupiter swap transaction', async () => {
    const params = {
      operation: 'swap'
    };

    const context = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'test'
    };

    const prepared = {
      transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      route: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: '10000000',
        outAmount: '2000000',
        priceImpactPct: '0.1',
        slippageBps: 50,
        marketInfos: []
      },
      fees: {
        signatureFeeLamports: 5000,
        prioritizationFeeLamports: 100000,
        rentFeeLamports: 0,
        feeBps: 2
      },
      router: 'iris',
      requestId: 'test-123'
    };

    const result = await buildProtocolTransaction({
      protocol: 'jupiter',
      context,
      params,
      prepared
    });

    expect(result).toBeDefined();
    expect(result.wireTransaction).toBe(prepared.transaction);
    expect(result.swap).toBeDefined();
    expect(result.swap.route).toBeDefined();
    expect(result.swap.fees).toBeDefined();
  });

  test('should throw error for unsupported protocol', async () => {
    await expect(async () => {
      await buildProtocolTransaction({
        protocol: 'invalid',
        context: { wallet: 'test', origin: 'test' },
        params: {},
        prepared: {}
      });
    }).toThrow('Unsupported protocol: invalid');
  });
});
