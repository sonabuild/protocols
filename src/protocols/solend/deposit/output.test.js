/**
 * Tests for Solend Deposit Output Transformation
 */

import { describe, test, expect } from 'bun:test';
import { transformDepositOutput } from './output.js';

describe('Solend Deposit - Output Transformation', () => {
  test('should add success field to enclave response', () => {
    const enclaveResponse = {
      transaction: 'base64tx',
      attestation: {
        signature: 'sig123',
        pcrs: {}
      },
      metadata: {
        protocol: 'solend',
        operation: 'deposit',
        timestamp: 1234567890
      },
      data: {
        wireTransaction: 'base64tx'
      }
    };

    const result = transformDepositOutput(enclaveResponse);

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
        protocol: 'solend',
        operation: 'deposit'
      }
    };

    const result = transformDepositOutput(enclaveResponse);

    expect(result).toEqual({
      success: true,
      ...enclaveResponse
    });
  });
});
