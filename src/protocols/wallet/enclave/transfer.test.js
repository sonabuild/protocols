import { describe, test, expect } from 'bun:test';
import { buildTransferTransaction } from './transfer.js';
import { buildProtocolTransaction, isSupportedProtocol, getSupportedProtocolIds } from '../../../enclave.js';

describe('Wallet Transfer - SOL', () => {
  test('should build SOL transfer transaction', () => {
    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 1.5, // 1.5 SOL
      operation: 'transfer'
    };

    const context = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'test'
    };

    const prepared = {
      lifetime: {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 123456789n
      }
    };

    const result = buildTransferTransaction(params, context, prepared);

    expect(result).toBeDefined();
    expect(result.wireTransaction).toBeDefined();
    expect(typeof result.wireTransaction).toBe('string');
    expect(result.transfer).toBeDefined();
    expect(result.transfer.from).toBe(context.wallet);
    expect(result.transfer.to).toBe(params.recipient);
    expect(result.transfer.amount).toBe('1.5');
    expect(result.transfer.symbol).toBe('SOL');
    expect(result.transfer.mint).toBeUndefined();
  });

  test('should build SOL transfer with memo', () => {
    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 0.1,
      memo: 'Payment for services',
      operation: 'transfer'
    };

    const context = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'test'
    };

    const prepared = {
      lifetime: {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 123456789n
      }
    };

    const result = buildTransferTransaction(params, context, prepared);

    expect(result).toBeDefined();
    expect(result.wireTransaction).toBeDefined();
    expect(result.transfer.memo).toBe('Payment for services');
  });
});

describe('Wallet Transfer - SPL Tokens', () => {
  test('should build USDC transfer by symbol', () => {
    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 100,
      symbol: 'USDC',
      operation: 'transfer'
    };

    const context = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'test'
    };

    const prepared = {
      lifetime: {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 123456789n
      },
      senderTokenAccount: 'BsWLxf4pVMgGmS7gQhFjCVQZmJbZx8aXFQvLNNiVPbmB',
      recipientTokenAccount: 'C3wMbCykDGVTQQZGFGkL1rz3u8xG2PUxRQkLWJvQyJwH'
    };

    const result = buildTransferTransaction(params, context, prepared);

    expect(result).toBeDefined();
    expect(result.wireTransaction).toBeDefined();
    expect(result.transfer.symbol).toBe('USDC');
    expect(result.transfer.amount).toBe('100');
  });

  test('should build USDT transfer by mint', () => {
    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 50,
      mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      operation: 'transfer'
    };

    const context = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'test'
    };

    const prepared = {
      lifetime: {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 123456789n
      },
      senderTokenAccount: 'BsWLxf4pVMgGmS7gQhFjCVQZmJbZx8aXFQvLNNiVPbmB',
      recipientTokenAccount: 'C3wMbCykDGVTQQZGFGkL1rz3u8xG2PUxRQkLWJvQyJwH'
    };

    const result = buildTransferTransaction(params, context, prepared);

    expect(result).toBeDefined();
    expect(result.wireTransaction).toBeDefined();
    expect(result.transfer.symbol).toBe('USDT');
    expect(result.transfer.mint).toBe(params.mint);
  });

  test('should throw error for SPL transfer without token accounts', () => {
    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 100,
      symbol: 'USDC',
      operation: 'transfer'
    };

    const context = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'test'
    };

    const prepared = {
      lifetime: {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 123456789n
      }
      // Missing senderTokenAccount and recipientTokenAccount
    };

    expect(() => buildTransferTransaction(params, context, prepared)).toThrow(
      'Token accounts must be provided for SPL token transfers'
    );
  });

  test('should throw error for unknown token mint', () => {
    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 100,
      mint: 'UnknownMint111111111111111111111111111111',
      operation: 'transfer'
    };

    const context = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'test'
    };

    const prepared = {
      lifetime: {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 123456789n
      },
      senderTokenAccount: 'BsWLxf4pVMgGmS7gQhFjCVQZmJbZx8aXFQvLNNiVPbmB',
      recipientTokenAccount: 'C3wMbCykDGVTQQZGFGkL1rz3u8xG2PUxRQkLWJvQyJwH'
    };

    expect(() => buildTransferTransaction(params, context, prepared)).toThrow(
      'Unknown token mint: UnknownMint111111111111111111111111111111'
    );
  });
});

describe('Wallet Transfer - Enclave Registration', () => {
  test('should register wallet protocol in enclave', () => {
    expect(isSupportedProtocol('wallet')).toBe(true);
    expect(getSupportedProtocolIds()).toContain('wallet');
  });

  test('should build wallet transfer via enclave dispatcher', async () => {

    const params = {
      recipient: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
      amount: 1.0,
      operation: 'transfer'
    };

    const context = {
      wallet: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      origin: 'test'
    };

    const prepared = {
      lifetime: {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 123456789n
      }
    };

    const result = await buildProtocolTransaction({
      protocol: 'wallet',
      context,
      params,
      prepared
    });

    expect(result).toBeDefined();
    expect(result.wireTransaction).toBeDefined();
    expect(result.transfer.symbol).toBe('SOL');
  });
});
