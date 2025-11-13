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

    console.log('Step 1: Preparing context from Jupiter Ultra API...');
    const prepared = await prepareJupiterSwapContext({ rpc, context: userContext, params });

    console.log('Context prepared:');
    console.log('  - Transaction length:', prepared.transaction?.length);
    console.log('  - Request ID:', prepared.requestId);
    console.log('  - Router:', prepared.router);
    console.log('  - Input amount:', prepared.route.inAmount);
    console.log('  - Output amount:', prepared.route.outAmount);
    console.log('  - Price impact:', prepared.route.priceImpactPct);

    // Validate context structure
    expect(prepared.transaction).toBeDefined();
    expect(typeof prepared.transaction).toBe('string');
    expect(prepared.route).toBeDefined();
    expect(prepared.fees).toBeDefined();

    console.log('\nStep 2: Building transaction in enclave format...');
    const result = buildJupiterSwapTransaction(params, userContext, prepared);

    console.log('Transaction built:');
    console.log('  - Wire transaction length:', result.wireTransaction.length);
    console.log('  - Swap info:', result.swap);

    // Validate result structure
    expect(result.wireTransaction).toBeDefined();
    expect(result.wireTransaction).toBe(prepared.transaction); // Should be the same
    expect(result.swap).toBeDefined();
    expect(result.swap.route).toBeDefined();
    expect(result.swap.route.inputMint).toBe(params.inputMint);
    expect(result.swap.route.outputMint).toBe(params.outputMint);
    expect(result.swap.fees).toBeDefined();

    console.log('\nStep 3: Validating transaction format...');
    // The transaction should be base64 encoded
    expect(() => Buffer.from(result.wireTransaction, 'base64')).not.toThrow();

    const txBuffer = Buffer.from(result.wireTransaction, 'base64');
    console.log('  - Transaction buffer length:', txBuffer.length);
    expect(txBuffer.length).toBeGreaterThan(0);

    console.log('\n✅ Integration test passed!');
  }, 60000);

  test('should log full context structure for debugging', async () => {
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

    console.log('\n=== FULL CONTEXT STRUCTURE ===');
    console.log(JSON.stringify({
      lifetime: {
        blockhash: prepared.lifetime.blockhash,
        lastValidBlockHeight: String(prepared.lifetime.lastValidBlockHeight)
      },
      userInputAta: String(prepared.userInputAta),
      userOutputAta: String(prepared.userOutputAta),
      route: {
        inputMint: prepared.route.inputMint,
        outputMint: prepared.route.outputMint,
        inAmount: prepared.route.inAmount,
        outAmount: prepared.route.outAmount,
        priceImpactPct: prepared.route.priceImpactPct,
        slippageBps: prepared.route.slippageBps,
        marketInfoCount: prepared.route.marketInfos?.length,
        marketInfos: prepared.route.marketInfos
      },
      transaction: `${prepared.transaction?.substring(0, 50)}... (${prepared.transaction?.length} chars)`,
      requestId: prepared.requestId,
      router: prepared.router,
      swapType: prepared.swapType,
      fees: prepared.fees
    }, null, 2));

    expect(prepared).toBeDefined();
  }, 60000);
});
