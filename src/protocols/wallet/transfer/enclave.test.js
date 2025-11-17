/**
 * Tests for wallet transfer enclave builder
 */

import { describe, test, expect } from 'bun:test';
import { buildTransferTransaction } from './enclave.js';

describe('Wallet Transfer Enclave', () => {
  const mockLifetime = {
    blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
    lastValidBlockHeight: 1000000n
  };

  describe('buildTransferTransaction - SOL transfers', () => {
    test('should build SOL transfer transaction', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 1.0
        }
      };

      const prepared = {
        lifetime: mockLifetime
      };

      const result = buildTransferTransaction(decryptedPayload, prepared, false);

      expect(result).toBeDefined();
      expect(result.wireTransaction).toBeDefined();
      expect(typeof result.wireTransaction).toBe('string');
      expect(result.transfer).toBeDefined();
      expect(result.transfer.symbol).toBe('SOL');
      expect(result.transfer.amount).toBe('1000000000'); // 1 SOL = 1e9 lamports
      expect(result.transfer.from).toBe('GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z');
      expect(result.transfer.to).toBe('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
    });

    test('should build SOL transfer with fractional amount', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 0.123456789
        }
      };

      const prepared = {
        lifetime: mockLifetime
      };

      const result = buildTransferTransaction(decryptedPayload, prepared, false);

      expect(result.transfer.amount).toBe('123456789'); // Exact lamports
    });

    test('should build SOL transfer with memo', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 1.0,
          memo: 'Test payment'
        }
      };

      const prepared = {
        lifetime: mockLifetime
      };

      const result = buildTransferTransaction(decryptedPayload, prepared, false);

      expect(result).toBeDefined();
      expect(result.wireTransaction).toBeDefined();
      expect(result.transfer.symbol).toBe('SOL');
    });
  });

  describe('buildTransferTransaction - SPL token transfers', () => {
    test('should build USDC transfer by symbol', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 100.50,
          symbol: 'USDC'
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        senderTokenAccount: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        recipientTokenAccount: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz'
      };

      const result = buildTransferTransaction(decryptedPayload, prepared, false);

      expect(result).toBeDefined();
      expect(result.wireTransaction).toBeDefined();
      expect(result.transfer.symbol).toBe('USDC');
      expect(result.transfer.amount).toBe('100500000'); // 100.50 USDC = 100.50e6
    });

    test('should build USDC transfer by mint', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 50.0,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC mint
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        senderTokenAccount: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        recipientTokenAccount: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz'
      };

      const result = buildTransferTransaction(decryptedPayload, prepared, false);

      expect(result).toBeDefined();
      expect(result.transfer.symbol).toBe('USDC');
      expect(result.transfer.amount).toBe('50000000');
    });

    test('should throw when token accounts are missing for SPL transfer', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 100.0,
          symbol: 'USDC'
        }
      };

      const prepared = {
        lifetime: mockLifetime
        // Missing senderTokenAccount and recipientTokenAccount
      };

      expect(() => buildTransferTransaction(decryptedPayload, prepared, false))
        .toThrow('Token accounts must be provided');
    });

    test('should throw for unknown token mint', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 100.0,
          mint: 'UnknownMint11111111111111111111111111111111'
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        senderTokenAccount: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        recipientTokenAccount: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz'
      };

      expect(() => buildTransferTransaction(decryptedPayload, prepared, false))
        .toThrow('Unknown token mint');
    });
  });

  describe('buildTransferTransaction - error handling', () => {
    test('should throw on amount overflow for SOL', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 10_000_000_000 // Way more than max safe SOL
        }
      };

      const prepared = {
        lifetime: mockLifetime
      };

      expect(() => buildTransferTransaction(decryptedPayload, prepared, false))
        .toThrow('Amount conversion failed');
    });

    test('should throw on amount overflow for USDC', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          recipient: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
          amount: 10_000_000_000_000, // Way more than max safe USDC
          symbol: 'USDC'
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        senderTokenAccount: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        recipientTokenAccount: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz'
      };

      expect(() => buildTransferTransaction(decryptedPayload, prepared, false))
        .toThrow('Amount conversion failed');
    });
  });
});
