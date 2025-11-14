/**
 * Tests for Solend enclave entry point
 *
 * Tests routing logic and error handling only.
 * Full transaction building is tested in deposit.test.js and withdraw.test.js
 */

import { describe, test, expect } from 'bun:test';
import { buildSolendTransaction } from './index.js';

describe('Solend Enclave Entry Point', () => {
  test('should throw error when params is undefined', async () => {
    await expect(async () => {
      await buildSolendTransaction({
        context: {},
        params: undefined,
        prepared: {}
      });
    }).toThrow('params is undefined in buildSolendTransaction');
  });
});
