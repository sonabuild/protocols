/**
 * Solend Protocol Schemas
 *
 * Defines operation and query schemas for the Solend lending protocol with
 * runtime validation, UI hints, and LLM integration metadata.
 */

import { z } from 'zod';
import { OperationSchema, QuerySchema, ProtocolSchema } from '../../schema/types.js';
import { TokenAmount, SolanaAddress, WireTransaction, BlockhashLifetime } from '../../shared/schemas.js';
import { USDC_MINT } from './shared/constants.js';

// USDC configuration (6 decimals)
const USDC_DECIMALS = 6;
const USDC_MIN = 1000;  // 0.001 USDC minimum
const USDC_MAX = 1_000_000_000_000;  // 1M USDC maximum

/**
 * Context schema for Solend operations
 * Defines what RPC data is needed to build Solend transactions
 */
export const SolendContextSchema = z.object({
  lifetime: BlockhashLifetime,
  userUsdcAta: SolanaAddress.describe('User USDC associated token account'),
  userCusdcAta: SolanaAddress.describe('User cUSDC (collateral) associated token account'),
  usdcAtaExists: z.boolean().describe('Whether user USDC ATA exists on-chain'),
  cusdcAtaExists: z.boolean().describe('Whether user cUSDC ATA exists on-chain'),
  obligationAccount: SolanaAddress.describe('Solend obligation account (derived from user wallet)'),
  obligationExists: z.boolean().describe('Whether obligation account exists on-chain'),
  accounts: z.object({
    reserve: z.object({
      address: SolanaAddress,
      data: z.array(z.number()).describe('Reserve account data as byte array')
    }),
    lendingMarket: z.object({
      address: SolanaAddress,
      data: z.array(z.number()).describe('Lending market account data as byte array')
    })
  }).describe('On-chain account data needed for transaction building')
}).describe('Context data for Solend transaction building');

/**
 * Deposit USDC operation
 */
export const depositOperation = new OperationSchema({
  id: 'solend_deposit',
  label: 'Deposit USDC',
  description: 'Deposit USDC into Solend lending pool to earn yield',
  operationType: 'deposit',

  // Params validation (wallet auto-injected)
  params: z.object({
    amount: TokenAmount(USDC_DECIMALS, 'USDC', USDC_MIN, USDC_MAX)
  }),

  // Context validation
  context: SolendContextSchema,

  // Output validation
  output: z.object({
    deposit: z.object({
      amount: z.string().describe('Deposited USDC amount'),
      amountRaw: z.string().describe('Deposited amount in smallest unit'),
      tokenSymbol: z.string().describe('Token symbol'),
      tokenMint: SolanaAddress.describe('Token mint address'),
      account: SolanaAddress.optional().describe('Obligation account')
    })
  }),

  // LLM integration metadata
  llm: {
    description: 'Deposit USDC tokens into Solend to earn interest. User receives cUSDC collateral tokens representing their deposit. Wallet is automatically provided from user context.',
    examples: [
      { query: 'Deposit 100 USDC into Solend', params: { amount: 100_000_000 } },
      { query: 'Lend 50 USDC to earn yield', params: { amount: 50_000_000 } }
    ]
  },

  displayData: (params) => ({
    deposit: {
      amount: (params.amount / 10 ** USDC_DECIMALS).toFixed(2),
      amountRaw: params.amount.toString(),
      tokenSymbol: 'USDC',
      tokenMint: USDC_MINT
    }
  })
});

/**
 * Withdraw USDC operation
 */
export const withdrawOperation = new OperationSchema({
  id: 'solend_withdraw',
  label: 'Withdraw USDC',
  description: 'Withdraw USDC from Solend lending pool',
  operationType: 'withdraw',

  // Params validation (wallet auto-injected)
  params: z.object({
    amount: TokenAmount(USDC_DECIMALS, 'USDC', USDC_MIN, USDC_MAX)
  }),

  // Context validation
  context: SolendContextSchema,

  // Output validation
  output: z.object({
    withdraw: z.object({
      amount: z.string().describe('Withdrawn USDC amount'),
      amountRaw: z.string().describe('Withdrawn amount in smallest unit'),
      tokenSymbol: z.string().describe('Token symbol'),
      tokenMint: SolanaAddress.describe('Token mint address'),
      account: SolanaAddress.optional().describe('Obligation account')
    })
  }),

  // LLM integration metadata
  llm: {
    description: 'Withdraw USDC tokens from Solend lending pool. Burns cUSDC collateral tokens and returns the underlying USDC. Wallet is automatically provided from user context.',
    examples: [
      { query: 'Withdraw 50 USDC from Solend', params: { amount: 50_000_000 } },
      { query: 'Remove all my USDC from lending', params: { amount: 100_000_000 } }
    ]
  },

  displayData: (params) => ({
    withdraw: {
      amount: (params.amount / 10 ** USDC_DECIMALS).toFixed(2),
      amountRaw: params.amount.toString(),
      tokenSymbol: 'USDC',
      tokenMint: USDC_MINT
    }
  })
});

/**
 * Positions query
 */
export const positionsQuery = new QuerySchema({
  id: 'solend_positions',
  endpoint: 'solend/positions',
  label: 'Your Position',
  description: 'View your Solend lending position and deposited USDC',

  // Params validation (no params needed - wallet comes from context)
  params: z.object({}),

  // Output validation
  output: z.object({
    obligation: SolanaAddress,
    exists: z.boolean().describe('Whether the obligation account exists'),
    depositedUSDC: z.string().describe('Human-readable deposited USDC amount'),
    depositedRaw: z.number().describe('Deposited amount in lamports (6 decimals)'),
    apy: z.number().optional().describe('Current APY percentage')
  }),

  // LLM integration metadata
  llm: {
    description: 'Query Solend lending position showing deposited USDC amount and current APY',
    canBeProactive: true,  // LLM can query without explicit user request
    examples: [
      { query: 'What is my Solend position?', params: { obligation: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw' } },
      { query: 'How much USDC do I have in Solend?', params: { obligation: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw' } }
    ]
  },

  // Card configuration for display
  card: {
    title: (data) => data.exists ? 'Your Solend Position' : 'No Position',
    subtitle: (data) => data.exists ? `Earning ${data.apy || '~5.2'}% APY` : 'Deposit USDC to start earning',
    metrics: [
      {
        key: 'depositedUSDC',
        label: 'Deposited',
        format: 'currency',
        suffix: ' USDC',
        highlight: true
      },
      {
        key: 'apy',
        label: 'Current APY',
        format: 'percentage',
        suffix: '%'
      }
    ]
  }
});

/**
 * Complete Solend protocol schema
 */
export const solendSchema = new ProtocolSchema({
  id: 'solend',
  label: 'Solend USDC',
  description: 'Deposit and withdraw USDC from Solend main pool to earn interest',

  operations: {
    deposit: depositOperation,
    withdraw: withdrawOperation
  },

  queries: {
    positions: positionsQuery
  }
});

// Export all schemas
export default {
  solendSchema,
  depositOperation,
  withdrawOperation,
  positionsQuery,
  SolendContextSchema
};
