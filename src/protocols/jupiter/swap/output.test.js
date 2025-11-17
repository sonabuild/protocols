/**
 * Tests for Jupiter Swap Output Transformation
 */

import { describe, test, expect } from 'bun:test';
import { transformSwapOutput } from './output.js';

describe('Jupiter Swap - Output Transformation', () => {
  test('should add success field to enclave response', () => {
    const enclaveResponse = {
      transaction: 'base64tx',
      attestation: {
        signature: 'sig123',
        pcrs: {}
      },
      metadata: {
        protocol: 'jupiter',
        operation: 'swap',
        timestamp: 1234567890
      },
      data: {
        wireTransaction: 'base64tx',
        route: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inAmount: '1000000000',
          outAmount: '50000000'
        }
      }
    };

    const result = transformSwapOutput(enclaveResponse);

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
        protocol: 'jupiter',
        operation: 'swap'
      }
    };

    const result = transformSwapOutput(enclaveResponse);

    expect(result).toEqual({
      success: true,
      ...enclaveResponse
    });
  });
});
