/**
 * Solend Withdrawal Tests
 *
 * Unit tests for Solend withdrawal transaction builder
 * Uses TDD approach based on reference mainnet transactions
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { createSolanaRpc } from '@solana/rpc';
import { getTransactionDecoder } from '@solana/transactions';
import { getCompiledTransactionMessageDecoder } from '@solana/transaction-messages';
import { buildWithdrawTransaction } from './withdraw.js';
import { prepareSolendContext } from '../context/index.js';
import { INSTRUCTION } from '../shared/constants.js';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Test configuration for withdrawal from Main Pool market
// Using same user as deposit test for consistency
// NOTE: This user must have an existing obligation with deposited collateral
// to successfully simulate withdrawal
const TEST_CONFIG = {
  user: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL', // Same user as deposit test
  amount: 100000, // Small withdrawal amount (0.1 cUSDC)
  discriminator: 15, // WithdrawObligationCollateralAndRedeemReserveCollateral (combined operation)
  accountCount: 13
};

describe('Solend Withdrawal', () => {
  let rpc;
  let userContext;
  let prepared;
  let transactionDecoder;
  let messageDecoder;

  beforeAll(async () => {
    rpc = createSolanaRpc(RPC_URL);
    transactionDecoder = getTransactionDecoder();
    messageDecoder = getCompiledTransactionMessageDecoder();

    // Prepare context once for all tests
    userContext = { wallet: TEST_CONFIG.user, origin: 'https://test.sona.build' };
    prepared = await prepareSolendContext({
      rpc,
      context: userContext,
    });
  });

  describe('Transaction Structure', () => {
    test('should return correct data structure', async () => {
      const params = {
        amount: TEST_CONFIG.amount
      };

      const result = buildWithdrawTransaction(params, userContext, prepared);

      // Should return wireTransaction and message
      expect(result).toBeDefined();
      expect(result.wireTransaction).toBeDefined();
      expect(typeof result.wireTransaction).toBe('string');
      expect(result.message).toBeDefined();
    });

    test('should use correct discriminator (9)', async () => {
      const params = {
        amount: TEST_CONFIG.amount
      };

      const result = buildWithdrawTransaction(params, userContext, prepared);
      const txBuffer = Buffer.from(result.wireTransaction, 'base64');
      const transaction = transactionDecoder.decode(new Uint8Array(txBuffer));
      const message = messageDecoder.decode(transaction.messageBytes);

      const instruction = message.instructions[0];
      expect(instruction.data[0]).toBe(TEST_CONFIG.discriminator);
    });

    test('should include correct number of accounts (13)', async () => {
      const params = {
        amount: TEST_CONFIG.amount
      };

      const result = buildWithdrawTransaction(params, userContext, prepared);
      const txBuffer = Buffer.from(result.wireTransaction, 'base64');
      const transaction = transactionDecoder.decode(new Uint8Array(txBuffer));
      const message = messageDecoder.decode(transaction.messageBytes);

      const instruction = message.instructions[0];
      expect(instruction.accountIndices.length).toBe(TEST_CONFIG.accountCount);
    });

    test('should encode amount as little-endian u64', async () => {
      const testAmount = 500000; // 0.5 cUSDC
      const params = {
        amount: testAmount
      };

      const result = buildWithdrawTransaction(params, userContext, prepared);
      const txBuffer = Buffer.from(result.wireTransaction, 'base64');
      const transaction = transactionDecoder.decode(new Uint8Array(txBuffer));
      const message = messageDecoder.decode(transaction.messageBytes);

      const instruction = message.instructions[0];
      const amount = Buffer.from(Object.values(instruction.data)).readBigUInt64LE(1);

      expect(amount).toBe(BigInt(testAmount));
    });
  });

  describe('Transaction Simulation (TDD)', () => {
    test('should build valid withdrawal transaction and pass simulation', async () => {
      // This test validates that our implementation creates a valid withdrawal transaction
      // that passes simulation for the Main Pool market

      const params = {
        amount: TEST_CONFIG.amount
      };

      const result = buildWithdrawTransaction(params, userContext, prepared);

      // Simulate transaction using RPC directly (accepts base64 encoded transaction)
      const simulation = await rpc.simulateTransaction(result.wireTransaction, {
        commitment: 'confirmed',
        encoding: 'base64',
        replaceRecentBlockhash: true
      }).send();

      // Assert simulation passes
      expect(simulation.value.err).toBeNull();
      expect(simulation.value.logs).toBeDefined();

      // Verify the instruction executed correctly
      const withdrawLog = simulation.value.logs.find(log =>
        log.includes('Withdraw Obligation Collateral and Redeem Reserve Collateral')
      );
      expect(withdrawLog).toBeDefined();
    }, 30000);

    test('should handle different withdrawal amounts', async () => {
      const amounts = [
        50000,    // 0.05 cUSDC
        100000,   // 0.1 cUSDC
      ];

      for (const amount of amounts) {
        const params = {
          amount
        };

        const result = buildWithdrawTransaction(params, userContext, prepared);

        const simulation = await rpc.simulateTransaction(result.wireTransaction, {
          commitment: 'confirmed',
          encoding: 'base64',
          replaceRecentBlockhash: true
        }).send();

        // All amounts should simulate successfully
        expect(simulation.value.err).toBeNull();
      }
    }, 30000);
  });

  describe('Constants Validation', () => {
    test('should use correct discriminator constant', () => {
      expect(INSTRUCTION.WITHDRAW_OBLIGATION_COLLATERAL_AND_REDEEM_RESERVE_COLLATERAL).toBe(15);
    });
  });
});
