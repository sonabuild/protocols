/**
 * Wallet Protocol Schemas
 *
 * Defines schemas for wallet operations including balance queries and token transfers.
 */

import { z } from 'zod';
import { QuerySchema, ProtocolSchema, OperationSchema } from '../../schema/types.js';
import { SolanaAddress, BlockhashLifetime } from '../../shared/schemas.js';

/**
 * Context schema for wallet transfer operations
 * Defines what RPC data is needed to build transfer transactions
 */
export const TransferContextSchema = z.object({
  lifetime: BlockhashLifetime,
  senderTokenAccount: SolanaAddress.optional().describe('Sender SPL token account (for SPL transfers)'),
  recipientTokenAccount: SolanaAddress.optional().describe('Recipient SPL token account (for SPL transfers)')
}).describe('Context data for wallet transfer transaction building');

/**
 * Token balance query
 */
export const balanceQuery = new QuerySchema({
  id: 'wallet_balance',
  endpoint: 'wallet/balance',
  label: 'Token Balance',
  description: 'Check wallet token balances (SOL, USDC, etc.)',

  // Params validation (wallet comes from context, not params)
  params: z.object({
    symbols: z.array(z.string()).optional().describe('Optional array of token symbols to query (e.g., ["USDC", "SOL"]). If omitted, returns all supported tokens (SOL, USDC, USDT).')
  }),

  // Output validation
  output: z.object({
    address: SolanaAddress,
    balances: z.record(z.object({
      symbol: z.string(),
      amount: z.string().describe('Human-readable amount'),
      amountRaw: z.string().describe('Raw amount in smallest unit'),
      decimals: z.number(),
      mint: z.string().optional().describe('Token mint address for SPL tokens')
    })).optional().describe('Map of token symbol to balance (for multiple tokens)'),
    // Single token response
    symbol: z.string().optional(),
    amount: z.string().optional(),
    amountRaw: z.string().optional(),
    decimals: z.number().optional(),
    mint: z.string().optional()
  }),

  // LLM integration metadata
  llm: {
    description: 'Query wallet token balances for SOL and SPL tokens like USDC. Returns human-readable amounts and raw lamport values. The wallet address is automatically provided from the user context. To query specific tokens, pass a symbols array with token symbols like ["USDC"] or ["SOL", "USDC"]. Omit symbols to get all balances.',
    canBeProactive: true,  // LLM can query without explicit user request
    examples: [
      { query: 'What is my USDC balance?', params: { symbols: ['USDC'] } },
      { query: 'Check my SOL and USDC balances', params: { symbols: ['SOL', 'USDC'] } },
      { query: 'Show all my token balances', params: {} }
    ]
  },

  // Card configuration for display
  card: {
    title: (data) => {
      // Single token response has 'symbol' field
      if (data.symbol) {
        return `${data.symbol} Balance`;
      }
      // Multiple tokens response has 'balances' object
      if (data.balances) {
        const tokenCount = Object.keys(data.balances).length;
        return tokenCount === 1 ? 'Token Balance' : 'Token Balances';
      }
      return 'Wallet Balance';
    },
    subtitle: (data) => {
      if (data.address) {
        return `${data.address.slice(0, 4)}...${data.address.slice(-4)}`;
      }
      return null;
    },
    metrics: (data) => {
      // Single token response
      if (data.symbol) {
        return [
          {
            key: 'amount',
            label: data.symbol,
            suffix: ` ${data.symbol}`,
            highlight: true
          }
        ];
      }

      // Multiple tokens response
      if (data.balances) {
        return Object.entries(data.balances).map(([symbol, balance]) => ({
          key: `balances.${symbol}.amount`,
          label: symbol,
          value: balance.amount,
          suffix: ` ${symbol}`,
          highlight: true
        }));
      }

      return [];
    }
  }
});

/**
 * Transfer operation
 * Supports both SOL (native) and SPL token transfers
 */
export const transferOperation = new OperationSchema({
  id: 'wallet_transfer',
  label: 'Transfer Tokens',
  description: 'Transfer SOL or SPL tokens to another wallet',
  operationType: 'transfer',

  params: z.object({
    recipient: z.string()
      .describe('Recipient wallet public key (Solana address)'),

    amount: z.number()
      .positive()
      .describe('Amount to transfer (in token units, not lamports)'),

    mint: z.string()
      .optional()
      .describe('Token mint address. Omit for SOL transfers. Common tokens: USDC=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, USDT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),

    symbol: z.string()
      .optional()
      .describe('Token symbol (e.g., "SOL", "USDC", "USDT"). Alternative to providing mint address.'),

    memo: z.string()
      .max(566)
      .optional()
      .describe('Optional memo/note for the transfer (max 566 characters)')
  }),

  context: TransferContextSchema,

  output: z.object({
    transfer: z.object({
      from: SolanaAddress,
      to: SolanaAddress,
      amount: z.string().describe('Amount transferred'),
      mint: z.string().optional().describe('Token mint (omitted for SOL)'),
      symbol: z.string().describe('Token symbol'),
      memo: z.string().optional().describe('Transfer memo if provided')
    })
  }),

  llm: {
    description: 'Transfer SOL or SPL tokens to another wallet address on Solana. Supports SOL (native), USDC, USDT, and other SPL tokens. The sender wallet is automatically provided from user context.',
    examples: [
      'Send 1 SOL to 6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      'Transfer 10 USDC to 6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
      'Pay 5 USDT to 6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e'
    ]
  },

  displayData: (params, userPubkey) => ({
    transfer: {
      from: userPubkey,
      to: params.recipient,
      amount: params.amount.toString(),
      mint: params.mint,
      symbol: params.symbol || 'SOL',
      memo: params.memo
    }
  })
});

/**
 * Complete wallet protocol schema
 */
export const walletSchema = new ProtocolSchema({
  id: 'wallet',
  label: 'Wallet',
  description: 'Wallet operations including balance queries and token transfers',

  operations: {
    transfer: transferOperation
  },

  queries: {
    balance: balanceQuery
  }
});

// Export all schemas
export default {
  walletSchema,
  balanceQuery,
  transferOperation,
  TransferContextSchema
};
