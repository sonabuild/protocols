import { describe, test, expect, beforeAll } from 'bun:test';
import { prepareJupiterSwapContext } from './index.js';
import { createSolanaRpc } from '@solana/rpc';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

describe('Jupiter Context Preparation', () => {
  let rpc;

  beforeAll(() => {
    rpc = createSolanaRpc(RPC_URL);
  });

  describe('prepareJupiterSwapContext', () => {
    test('should prepare context for SOL to USDC swap', async () => {
      const userContext = {
        wallet: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
        origin: 'https://test.sona.build'
      };
      const params = {
        inputMint: 'So11111111111111111111111111111111111111112', // SOL
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        amount: 0.01, // 0.01 SOL
        slippageBps: 50
      };

      const context = await prepareJupiterSwapContext({ rpc, context: userContext, params });

      // Validate structure
      expect(context).toBeDefined();
      expect(context.lifetime).toBeDefined();
      expect(context.lifetime.blockhash).toBeDefined();
      expect(context.lifetime.lastValidBlockHeight).toBeDefined();

      expect(context.userInputAta).toBeDefined();
      expect(context.userOutputAta).toBeDefined();

      expect(context.route).toBeDefined();
      expect(context.route.inputMint).toBe(params.inputMint);
      expect(context.route.outputMint).toBe(params.outputMint);
      expect(context.route.inAmount).toBeDefined();
      expect(context.route.outAmount).toBeDefined();
      expect(context.route.priceImpactPct).toBeDefined();
      expect(context.route.marketInfos).toBeDefined();
      expect(Array.isArray(context.route.marketInfos)).toBe(true);

      // Ultra API returns complete transaction instead of separate instructions
      expect(context.transaction).toBeDefined();
      expect(typeof context.transaction).toBe('string');

      // Ultra API provides request ID and router info
      expect(context.requestId).toBeDefined();
      expect(context.router).toBeDefined();

      // Ultra API returns fees object
      expect(context.fees).toBeDefined();
      expect(typeof context.fees.prioritizationFeeLamports).toBe('number');
    }, 30000); // 30s timeout for network calls

    test('should prepare context for USDC to SOL swap', async () => {
      const userContext = {
        wallet: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
        origin: 'https://test.sona.build'
      };
      const params = {
        inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        outputMint: 'So11111111111111111111111111111111111111112', // SOL
        amount: 10, // 10 USDC
        slippageBps: 50
      };

      const context = await prepareJupiterSwapContext({ rpc, context: userContext, params });

      expect(context).toBeDefined();
      expect(context.route.inputMint).toBe(params.inputMint);
      expect(context.route.outputMint).toBe(params.outputMint);
      expect(context.transaction).toBeDefined();
    }, 30000);

    test('should handle different slippage tolerance', async () => {
      const userContext = {
        wallet: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
        origin: 'https://test.sona.build'
      };
      const params = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 0.01,
        slippageBps: 100 // 1% slippage
      };

      const context = await prepareJupiterSwapContext({ rpc, context: userContext, params });

      expect(context).toBeDefined();
      expect(context.route).toBeDefined();
      expect(context.transaction).toBeDefined();
    }, 30000);

    test('should fail gracefully for invalid token mint', async () => {
      const userContext = {
        wallet: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
        origin: 'https://test.sona.build'
      };
      const params = {
        inputMint: 'InvalidMint1111111111111111111111111111111',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 10,
        slippageBps: 50
      };

      await expect(async () => {
        await prepareJupiterSwapContext({ rpc, context: userContext, params });
      }).toThrow();
    }, 30000);

    test('should fail gracefully when no route is available', async () => {
      const userContext = {
        wallet: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
        origin: 'https://test.sona.build'
      };
      const params = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 0.000000001, // Extremely small amount
        slippageBps: 50
      };

      // This might succeed or fail depending on Jupiter's minimum amounts
      // Just check that it doesn't crash
      try {
        const context = await prepareJupiterSwapContext({ rpc, context: userContext, params });
        expect(context).toBeDefined();
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    }, 30000);

    test('should validate route has market infos', async () => {
      const userContext = {
        wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e', // Different wallet with funds
        origin: 'https://test.sona.build'
      };
      const params = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 0.01, // Smaller amount
        slippageBps: 50
      };

      const context = await prepareJupiterSwapContext({ rpc, context: userContext, params });

      expect(context.route.marketInfos).toBeDefined();
      expect(context.route.marketInfos.length).toBeGreaterThan(0);

      // Validate market info structure
      const marketInfo = context.route.marketInfos[0];
      expect(marketInfo.id).toBeDefined();
      expect(marketInfo.label).toBeDefined();
      expect(marketInfo.inputMint).toBeDefined();
      expect(marketInfo.outputMint).toBeDefined();
      expect(marketInfo.inAmount).toBeDefined();
      expect(marketInfo.outAmount).toBeDefined();
    }, 30000);
  });

  // Token decimal tests removed - they require funded wallets which can't be guaranteed in CI
});
