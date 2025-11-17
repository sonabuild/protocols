/**
 * Tests for Solend withdraw enclave builder
 */

import { describe, test, expect } from 'bun:test';
import { buildWithdrawTransaction } from './enclave.js';

describe('Solend Withdraw Enclave', () => {
  const mockLifetime = {
    blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
    lastValidBlockHeight: 1000000n
  };

  describe('buildWithdrawTransaction', () => {
    test('should build withdraw transaction for 100 USDC', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          amount: 100.0
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        userUsdcAta: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        userCusdcAta: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz',
        obligationAccount: '9hKHfuF5vX3kYqBGmk83S8ek8BuXYmtvP3kpQp8aQTUi'
      };

      const result = buildWithdrawTransaction(decryptedPayload, prepared, false);

      expect(result).toBeDefined();
      expect(result.wireTransaction).toBeDefined();
      expect(typeof result.wireTransaction).toBe('string');
      expect(result.withdraw).toBeDefined();
      expect(result.withdraw.amount).toBe('100');
      expect(result.withdraw.amountRaw).toBe('100000000'); // 100 USDC = 100e6
      expect(result.withdraw.tokenSymbol).toBe('USDC');
      expect(result.withdraw.tokenMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(result.withdraw.account).toBe('9hKHfuF5vX3kYqBGmk83S8ek8BuXYmtvP3kpQp8aQTUi');
    });

    test('should build withdraw transaction for fractional amount', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          amount: 0.5
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        userUsdcAta: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        userCusdcAta: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz',
        obligationAccount: '9hKHfuF5vX3kYqBGmk83S8ek8BuXYmtvP3kpQp8aQTUi'
      };

      const result = buildWithdrawTransaction(decryptedPayload, prepared, false);

      expect(result.withdraw.amount).toBe('0.5');
      expect(result.withdraw.amountRaw).toBe('500000'); // 0.5 USDC = 500000
    });

    test('should build withdraw transaction for 1000 USDC', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          amount: 1000.0
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        userUsdcAta: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        userCusdcAta: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz',
        obligationAccount: '9hKHfuF5vX3kYqBGmk83S8ek8BuXYmtvP3kpQp8aQTUi'
      };

      const result = buildWithdrawTransaction(decryptedPayload, prepared, false);

      expect(result.withdraw.amount).toBe('1000');
      expect(result.withdraw.amountRaw).toBe('1000000000');
    });

    test('should build withdraw transaction for minimum amount', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          amount: 0.000001 // 1 micro-USDC
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        userUsdcAta: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        userCusdcAta: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz',
        obligationAccount: '9hKHfuF5vX3kYqBGmk83S8ek8BuXYmtvP3kpQp8aQTUi'
      };

      const result = buildWithdrawTransaction(decryptedPayload, prepared, false);

      expect(result.withdraw.amountRaw).toBe('1'); // 1 raw unit
    });

    test('should return valid base64 wire transaction', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          amount: 50.0
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        userUsdcAta: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        userCusdcAta: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz',
        obligationAccount: '9hKHfuF5vX3kYqBGmk83S8ek8BuXYmtvP3kpQp8aQTUi'
      };

      const result = buildWithdrawTransaction(decryptedPayload, prepared, false);

      // Verify it's valid base64
      expect(() => Buffer.from(result.wireTransaction, 'base64')).not.toThrow();

      // Decode and check it's not empty
      const decoded = Buffer.from(result.wireTransaction, 'base64');
      expect(decoded.length).toBeGreaterThan(0);
    });

    test('should include all required withdraw metadata', () => {
      const decryptedPayload = {
        context: {
          wallet: 'GJRYWkVsm5VuWZ1YUGgZLmvfKN7YQTTKkqpXiFh6YC9z',
          origin: 'https://example.com'
        },
        params: {
          amount: 75.5
        }
      };

      const prepared = {
        lifetime: mockLifetime,
        userUsdcAta: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
        userCusdcAta: '8YAnkFyD3r5TDzPrRxqPH92Y9LNkRdBv8Vg25pnxf8Wz',
        obligationAccount: '9hKHfuF5vX3kYqBGmk83S8ek8BuXYmtvP3kpQp8aQTUi'
      };

      const result = buildWithdrawTransaction(decryptedPayload, prepared, false);

      expect(result.withdraw).toHaveProperty('amount');
      expect(result.withdraw).toHaveProperty('amountRaw');
      expect(result.withdraw).toHaveProperty('tokenSymbol');
      expect(result.withdraw).toHaveProperty('tokenMint');
      expect(result.withdraw).toHaveProperty('account');
    });
  });
});
