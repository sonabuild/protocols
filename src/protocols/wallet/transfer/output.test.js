/**
 * Tests for Wallet Transfer Output Transformation
 */

import { describe, test, expect } from 'bun:test';
import { transformTransferOutput } from './output.js';

describe('Wallet Transfer - Output Transformation', () => {
  test('should add success field to enclave response', () => {
    const enclaveResponse = {
      transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAo=',
      attestation: {
        signature: 'abc123',
        pcrs: {}
      },
      metadata: {
        protocol: 'wallet',
        operation: 'transfer',
        timestamp: 1234567890
      },
      data: {
        wireTransaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAo='
      }
    };

    const result = transformTransferOutput(enclaveResponse);

    expect(result.success).toBe(true);
    expect(result.transaction).toBe(enclaveResponse.transaction);
    expect(result.attestation).toBe(enclaveResponse.attestation);
    expect(result.metadata).toBe(enclaveResponse.metadata);
    expect(result.data).toBe(enclaveResponse.data);
  });

  test('should preserve all enclave response fields', () => {
    const enclaveResponse = {
      transaction: 'base64tx',
      metadata: {
        protocol: 'wallet',
        operation: 'transfer'
      }
    };

    const result = transformTransferOutput(enclaveResponse);

    expect(result).toEqual({
      success: true,
      ...enclaveResponse
    });
  });
});
