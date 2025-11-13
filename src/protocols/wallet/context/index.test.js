import { describe, test, expect } from 'bun:test';
import { prepareTransferContext } from './index.js';

describe('Wallet Transfer Context - Unit Tests', () => {
  test('should prepare context for SOL transfer', async () => {

    // Mock RPC client
    const mockRpc = {
      getLatestBlockhash: () => ({
        send: async () => ({
          value: {
            blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
            lastValidBlockHeight: 123456789n
          }
        })
      })
    };

    const userContext = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'https://test.sona.build'
    };

    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 1.5
      // No mint or symbol = SOL transfer
    };

    const context = await prepareTransferContext({ rpc: mockRpc, context: userContext, params });

    expect(context).toBeDefined();
    expect(context.lifetime).toBeDefined();
    expect(context.lifetime.blockhash).toBe('EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N');
    expect(context.lifetime.lastValidBlockHeight).toBe(123456789n);
    expect(context.senderTokenAccount).toBeUndefined();
    expect(context.recipientTokenAccount).toBeUndefined();
  });

  test('should prepare context with token accounts for USDC transfer by symbol', async () => {

    const mockRpc = {
      getLatestBlockhash: () => ({
        send: async () => ({
          value: {
            blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
            lastValidBlockHeight: 123456789n
          }
        })
      })
    };

    const userContext = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'https://test.sona.build'
    };
    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 100,
      symbol: 'USDC'
    };

    const context = await prepareTransferContext({ rpc: mockRpc, context: userContext, params });

    expect(context).toBeDefined();
    expect(context.lifetime).toBeDefined();
    expect(context.senderTokenAccount).toBeDefined();
    expect(context.recipientTokenAccount).toBeDefined();
    expect(typeof context.senderTokenAccount).toBe('string');
    expect(typeof context.recipientTokenAccount).toBe('string');
  });

  test('should prepare context with token accounts for USDT transfer by mint', async () => {

    const mockRpc = {
      getLatestBlockhash: () => ({
        send: async () => ({
          value: {
            blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
            lastValidBlockHeight: 123456789n
          }
        })
      })
    };

    const userContext = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'https://test.sona.build'
    };
    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 50,
      mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' // USDT
    };

    const context = await prepareTransferContext({ rpc: mockRpc, context: userContext, params });

    expect(context).toBeDefined();
    expect(context.lifetime).toBeDefined();
    expect(context.senderTokenAccount).toBeDefined();
    expect(context.recipientTokenAccount).toBeDefined();
  });
});
