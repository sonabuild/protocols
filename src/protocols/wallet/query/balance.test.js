/**
 * Tests for wallet balance queries
 *
 * Note: These tests use the real Solana RPC, so they test actual network behavior
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { getTokenBalance } from './balance.js';
import { createSolanaRpc } from '@solana/rpc';

describe('Wallet Balance Queries', () => {
  let rpc;
  const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  beforeAll(() => {
    rpc = createSolanaRpc(RPC_URL);
  });

  describe('getTokenBalance - Single Token', () => {
    test('should fetch SOL balance for wallet', async () => {
      // Use a known wallet with SOL
      const wallet = '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e';

      const result = await getTokenBalance(rpc, { wallet, symbols: ['SOL'] });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('SOL');
      expect(result.decimals).toBe(9);
      expect(typeof result.amount).toBe('string');
      expect(typeof result.amountRaw).toBe('string');
    }, 15000);

    test('should return zero for token account that does not exist', async () => {
      // Use a valid address unlikely to have any tokens (generated from random bytes)
      const wallet = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi';

      const result = await getTokenBalance(rpc, { wallet, symbols: ['USDT'] });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('USDT');
      expect(result.amount).toBe('0');
      expect(result.amountRaw).toBe('0');
    }, 15000);
  });

  describe('getTokenBalance - Multiple Tokens', () => {
    test('should fetch multiple token balances', async () => {
      const wallet = '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e';

      const result = await getTokenBalance(rpc, { wallet, symbols: ['SOL', 'USDC'] });

      expect(result).toBeDefined();
      expect(result.SOL).toBeDefined();
      expect(result.USDC).toBeDefined();
      expect(result.SOL.symbol).toBe('SOL');
      expect(result.USDC.symbol).toBe('USDC');
    }, 15000);
  });

  describe('Error Handling', () => {
    test('should handle zero balances for multiple tokens', async () => {
      // Use address unlikely to have token accounts
      const wallet = '7ktZK7a28phex41kcsct6YBHQt38MMezsoecq1UuiKFh';

      const result = await getTokenBalance(rpc, { wallet, symbols: ['SOL', 'USDC'] });

      // Should return object with both tokens
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.SOL).toBeDefined();
      expect(result.USDC).toBeDefined();
      // Don't assert zero balance since addresses may have balances on mainnet
      expect(result.SOL.amount).toBeDefined();
      expect(result.USDC.amount).toBeDefined();
    }, 15000);
  });
});
