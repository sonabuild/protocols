import { z } from 'zod';
import { OperationSchema, ProtocolSchema } from '../../schema/types.js';
import { SolanaAddress, BlockhashLifetime } from '../../shared/schemas.js';

/**
 * Context schema for Jupiter swap operations
 * Defines what data Jupiter Ultra API provides for transaction building
 */
export const JupiterContextSchema = z.object({
  lifetime: BlockhashLifetime,
  userInputAta: SolanaAddress.describe('User input token associated token account'),
  userOutputAta: SolanaAddress.describe('User output token associated token account'),
  route: z.object({
    inputMint: z.string(),
    outputMint: z.string(),
    inAmount: z.string().describe('Input amount in lamports'),
    outAmount: z.string().describe('Expected output amount in lamports'),
    priceImpactPct: z.string().describe('Price impact percentage as string'),
    slippageBps: z.number().optional().describe('Slippage tolerance in basis points'),
    marketInfos: z.array(z.object({
      id: z.string().optional(),
      label: z.string().optional(),
      inputMint: z.string().optional(),
      outputMint: z.string().optional(),
      inAmount: z.string().optional(),
      outAmount: z.string().optional(),
      percent: z.number().optional()
    }))
  }),
  transaction: z.string().describe('Pre-built transaction from Jupiter Ultra API'),
  requestId: z.string().optional(),
  router: z.string().optional(),
  swapType: z.string().optional(),
  fees: z.object({
    signatureFeeLamports: z.number(),
    prioritizationFeeLamports: z.number(),
    rentFeeLamports: z.number(),
    feeBps: z.number().optional(),
    platformFee: z.any().optional()
  }).optional()
}).describe('Context data for Jupiter swap transaction building');

/**
 * Jupiter Swap Operation
 *
 * Swaps tokens using Jupiter aggregator with optimal routing.
 * Jupiter finds the best price across all Solana DEXs.
 */
export const swapOperation = new OperationSchema({
  id: 'jupiter_swap',
  label: 'Jupiter Swap',
  description: 'Swap tokens using Jupiter aggregator with optimal routing',
  operationType: 'swap',

  params: z.object({
    inputMint: z.string()
      .describe('Input token mint address on Solana. Common tokens: SOL=So11111111111111111111111111111111111111112, USDC=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, USDT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB, JUP=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN, BONK=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),

    outputMint: z.string()
      .describe('Output token mint address on Solana. Common tokens: SOL=So11111111111111111111111111111111111111112, USDC=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, USDT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB, JUP=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN, BONK=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),

    amount: z.number()
      .positive()
      .describe('Amount of input token to swap (in token units, not lamports)'),

    slippageBps: z.number()
      .int()
      .min(1)
      .max(10000)
      .default(50)
      .describe('Slippage tolerance in basis points (50 = 0.5%, 100 = 1%)'),
  }),

  context: JupiterContextSchema,

  output: z.object({
    swap: z.object({
      inputToken: z.object({
        symbol: z.string(),
        amount: z.string(),
        mint: z.string()
      }),
      outputToken: z.object({
        symbol: z.string(),
        estimatedAmount: z.string(),
        mint: z.string()
      }),
      route: z.object({
        priceImpact: z.number(),
        slippage: z.number(),
        marketInfos: z.array(z.object({
          id: z.string(),
          label: z.string(),
          inputMint: z.string(),
          outputMint: z.string(),
          inAmount: z.string(),
          outAmount: z.string()
        })).optional()
      })
    })
  }),

  llm: {
    description: 'Swap tokens using Jupiter aggregator on Solana blockchain. Automatically finds the best route across all Solana DEXs. Wallet is automatically provided from user context. IMPORTANT: Use Solana mint addresses - SOL: So11111111111111111111111111111111111111112, USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB, JUP: JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN, BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    examples: [
      'Swap 1 SOL for USDC',
      'Exchange 100 USDC to SOL',
      'Trade 50 USDC for BONK',
      'Convert 0.5 SOL to JUP',
      'Buy JUP with 10 USDC'
    ]
  },

  displayData: (params) => ({
    swap: {
      inputToken: {
        symbol: getMintSymbol(params.inputMint),
        amount: params.amount.toString(),
        mint: params.inputMint
      },
      outputToken: {
        symbol: getMintSymbol(params.outputMint),
        mint: params.outputMint
      },
      route: {
        slippage: params.slippageBps || 50
      }
    }
  })
});

// Helper to get human-readable token symbols from mint addresses
function getMintSymbol(mint) {
  const knownMints = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK'
  };

  return knownMints[mint] || mint.slice(0, 4) + '...' + mint.slice(-4);
}

// Export schema metadata for registration
export const jupiterSchema = new ProtocolSchema({
  id: 'jupiter',
  label: 'Jupiter Aggregator',
  description: 'Swap tokens using Jupiter aggregator with optimal routing across all Solana DEXs',

  operations: {
    swap: swapOperation
  },

  queries: {}
});

// Export all schemas
export default {
  jupiterSchema,
  swapOperation,
  JupiterContextSchema
};
