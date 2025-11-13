/**
 * Solend Context Utilities Tests
 *
 * Unit tests for pure utility functions in context preparation
 */

import { describe, test, expect } from 'bun:test';
import { deriveObligationFromWallet } from './index.js';
import { address } from '@solana/addresses';

describe('Solend Context Utilities', () => {
  describe('deriveObligationFromWallet', () => {
    test('should derive obligation address from wallet pubkey', async () => {
      const walletPubkey = address('8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL');

      const obligationAddress = await deriveObligationFromWallet(walletPubkey);

      expect(obligationAddress).toBeDefined();
      expect(typeof obligationAddress).toBe('string');
      expect(obligationAddress.length).toBeGreaterThan(32); // Valid base58 address
    });

    test('should be deterministic for same wallet', async () => {
      const walletPubkey = address('8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL');

      const obligation1 = await deriveObligationFromWallet(walletPubkey);
      const obligation2 = await deriveObligationFromWallet(walletPubkey);

      expect(obligation1).toBe(obligation2);
    });

    test('should derive different obligations for different wallets', async () => {
      const wallet1 = address('8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL');
      const wallet2 = address('6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e');

      const obligation1 = await deriveObligationFromWallet(wallet1);
      const obligation2 = await deriveObligationFromWallet(wallet2);

      expect(obligation1).not.toBe(obligation2);
    });
  });
});
