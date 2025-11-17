/**
 * Tests for Solend Withdraw Output Transformation
 */

import { describe, test, expect } from 'bun:test';
import { transformWithdrawOutput } from './output.js';

describe('Solend Withdraw - Output Transformation', () => {
  test('should add success field to enclave response', () => {
    const enclaveResponse = {
      transaction: 'base64tx',
      attestation: {
        signature: 'sig123',
        pcrs: {}
      },
      metadata: {
        protocol: 'solend',
        operation: 'withdraw',
        timestamp: 1234567890
      },
      data: {
        wireTransaction: 'base64tx'
      }
    };

    const result = transformWithdrawOutput(enclaveResponse);

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
        operation: 'withdraw'
      }
    };

    const result = transformWithdrawOutput(enclaveResponse);

    expect(result).toEqual({
      success: true,
      ...enclaveResponse
    });
  });
});
