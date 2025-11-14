import { describe, test, expect } from 'bun:test';
import { prepareJupiterSwapContext } from './context/index.js';
import { buildJupiterSwapTransaction } from './enclave/swap.js';
import { createSolanaRpc } from '@solana/rpc';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

describe('Jupiter Integration Tests', () => {
  test('should prepare context and build transaction for SOL to USDC swap', async () => {
    const rpc = createSolanaRpc(RPC_URL);

    // Test input
    const userContext = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'https://test.sona.build'
    };
    const params = {
      inputMint: 'So11111111111111111111111111111111111111112', // SOL
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      amount: 0.01,
      slippageBps: 50,
      operation: 'swap'
    };

    const prepared = await prepareJupiterSwapContext({ rpc, context: userContext, params });

    // Validate context structure
    expect(prepared.transaction).toBeDefined();
    expect(typeof prepared.transaction).toBe('string');
    expect(prepared.route).toBeDefined();
    expect(prepared.fees).toBeDefined();

    const result = buildJupiterSwapTransaction(params, userContext, prepared);

    // Validate result structure
    expect(result.wireTransaction).toBeDefined();
    expect(result.wireTransaction).toBe(prepared.transaction); // Should be the same
    expect(result.swap).toBeDefined();
    expect(result.swap.route).toBeDefined();
    expect(result.swap.route.inputMint).toBe(params.inputMint);
    expect(result.swap.route.outputMint).toBe(params.outputMint);
    expect(result.swap.fees).toBeDefined();

    // The transaction should be base64 encoded
    expect(() => Buffer.from(result.wireTransaction, 'base64')).not.toThrow();

    const txBuffer = Buffer.from(result.wireTransaction, 'base64');
    expect(txBuffer.length).toBeGreaterThan(0);
  }, 60000);

  test('should validate full context structure', async () => {
    const rpc = createSolanaRpc(RPC_URL);

    const userContext = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'https://test.sona.build'
    };
    const params = {
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: 0.01,
      slippageBps: 50
    };

    const prepared = await prepareJupiterSwapContext({ rpc, context: userContext, params });

    // Validate complete context structure
    expect(prepared).toBeDefined();
    expect(prepared.lifetime).toBeDefined();
    expect(prepared.lifetime.blockhash).toBeDefined();
    expect(prepared.lifetime.lastValidBlockHeight).toBeDefined();
    expect(prepared.userInputAta).toBeDefined();
    expect(prepared.userOutputAta).toBeDefined();
    expect(prepared.route).toBeDefined();
    expect(prepared.route.inputMint).toBe(params.inputMint);
    expect(prepared.route.outputMint).toBe(params.outputMint);
    expect(prepared.route.inAmount).toBeDefined();
    expect(prepared.route.outAmount).toBeDefined();
    expect(prepared.route.priceImpactPct).toBeDefined();
    expect(prepared.route.marketInfos).toBeDefined();
    expect(Array.isArray(prepared.route.marketInfos)).toBe(true);
    expect(prepared.transaction).toBeDefined();
    expect(prepared.requestId).toBeDefined();
    expect(prepared.router).toBeDefined();
    expect(prepared.swapType).toBeDefined();
    expect(prepared.fees).toBeDefined();
  }, 60000);
});
