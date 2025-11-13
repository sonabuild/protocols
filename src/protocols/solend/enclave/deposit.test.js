/**
 * Solend Deposit Tests
 *
 * Unit tests for Solend deposit transaction builder
 * Uses TDD approach based on reference mainnet transactions
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { createSolanaRpc } from '@solana/rpc';
import { getTransactionDecoder } from '@solana/transactions';
import { getCompiledTransactionMessageDecoder } from '@solana/transaction-messages';
import { buildDepositTransaction } from './deposit.js';
import { prepareSolendContext } from '../context/index.js';
import { INSTRUCTION } from '../shared/constants.js';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Reference transaction that successfully deposited 1 USDC
// Signature: 31MUMU8oqwyiwct3M9jTnfMAxhXNfNRzRVB3BKRTk4PQQsES2Nyat6yMmBrJUWAKjL9iA26vJMsjHPJqroEYJ1Fc
const REFERENCE_TX = {
  user: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
  amount: 1000000, // 1 USDC
  discriminator: 14,
  accountCount: 14
};

describe('Solend Deposit', () => {
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
    userContext = { wallet: REFERENCE_TX.user, origin: 'https://test.sona.build' };
    prepared = await prepareSolendContext({
      rpc,
      context: userContext,
    });
  });

  describe('Transaction Structure', () => {
    test('should return correct data structure', async () => {
      const params = {
        amount: REFERENCE_TX.amount
      };

      const result = buildDepositTransaction(params, userContext, prepared);

      // Should return wireTransaction and message
      expect(result).toBeDefined();
      expect(result.wireTransaction).toBeDefined();
      expect(typeof result.wireTransaction).toBe('string');
      expect(result.message).toBeDefined();
    });

    test('should use correct discriminator (14)', async () => {
      const params = {
        amount: REFERENCE_TX.amount
      };

      const result = buildDepositTransaction(params, userContext, prepared);
      const txBuffer = Buffer.from(result.wireTransaction, 'base64');
      const transaction = transactionDecoder.decode(new Uint8Array(txBuffer));
      const message = messageDecoder.decode(transaction.messageBytes);

      const instruction = message.instructions[0];
      expect(instruction.data[0]).toBe(REFERENCE_TX.discriminator);
    });

    test('should include correct number of accounts (14)', async () => {
      const params = {
        amount: REFERENCE_TX.amount
      };

      const result = buildDepositTransaction(params, userContext, prepared);
      const txBuffer = Buffer.from(result.wireTransaction, 'base64');
      const transaction = transactionDecoder.decode(new Uint8Array(txBuffer));
      const message = messageDecoder.decode(transaction.messageBytes);

      const instruction = message.instructions[0];
      expect(instruction.accountIndices.length).toBe(REFERENCE_TX.accountCount);
    });

    test('should encode amount as little-endian u64', async () => {
      const testAmount = 5000000; // 5 USDC
      const params = {
        amount: testAmount
      };

      const result = buildDepositTransaction(params, userContext, prepared);
      const txBuffer = Buffer.from(result.wireTransaction, 'base64');
      const transaction = transactionDecoder.decode(new Uint8Array(txBuffer));
      const message = messageDecoder.decode(transaction.messageBytes);

      const instruction = message.instructions[0];
      const amount = Buffer.from(Object.values(instruction.data)).readBigUInt64LE(1);

      expect(amount).toBe(BigInt(testAmount));
    });
  });

  describe('Transaction Simulation (TDD)', () => {
    test('should replicate reference transaction and pass simulation', async () => {
      // This is the TDD test that validates our implementation against a known working transaction
      // Reference: 31MUMU8oqwyiwct3M9jTnfMAxhXNfNRzRVB3BKRTk4PQQsES2Nyat6yMmBrJUWAKjL9iA26vJMsjHPJqroEYJ1Fc

      const params = {
        amount: REFERENCE_TX.amount
      };

      const result = buildDepositTransaction(params, userContext, prepared);

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
      const depositLog = simulation.value.logs.find(log =>
        log.includes('Deposit Reserve Liquidity and Obligation Collateral')
      );
      expect(depositLog).toBeDefined();
    }, 30000);

    test('should handle different deposit amounts', async () => {
      const amounts = [
        100000,    // 0.1 USDC
        1000000,   // 1 USDC
        10000000,  // 10 USDC
      ];

      for (const amount of amounts) {
        const params = {
          amount
        };

        const result = buildDepositTransaction(params, userContext, prepared);

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
      expect(INSTRUCTION.DEPOSIT_RESERVE_LIQUIDITY_AND_OBLIGATION_COLLATERAL).toBe(14);
    });
  });
});
