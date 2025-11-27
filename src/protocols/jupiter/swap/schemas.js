import { z } from 'zod';
import { SolanaAddress, BlockhashLifetime, WireTransaction } from '../../../shared/schemas.js';

export const swapInputSchema = z.object({
  inputMint: SolanaAddress
    .describe('Input token mint address on Solana. Common tokens: SOL=So11111111111111111111111111111111111111112, USDC=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, BONK=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263, USDT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB, JUP=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'),

  outputMint: SolanaAddress
    .describe('Output token mint address on Solana. Common tokens: SOL=So11111111111111111111111111111111111111112, USDC=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, BONK=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263, USDT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB, JUP=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'),

  amount: z.number()
    .positive()
    .describe('Amount of input token to swap (in token units, not lamports)'),

  slippageBps: z.number()
    .int()
    .min(1)
    .max(10000)
    .default(50)
    .describe('Slippage tolerance in basis points (50 = 0.5%, 100 = 1%)'),
});

export const swapEnclaveSchema = z.object({
  lifetime: BlockhashLifetime,

  userInputAta: SolanaAddress
    .describe('User input token associated token account'),

  userOutputAta: SolanaAddress
    .describe('User output token associated token account'),

  route: z.object({
    inputMint: SolanaAddress,
    outputMint: SolanaAddress,
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

  transaction: WireTransaction
    .describe('Pre-built transaction from Jupiter Ultra API'),

  requestId: z.string().optional(),
  router: z.string().optional(),
  swapType: z.string().optional(),

  fees: z.object({
    signatureFeeLamports: z.number().int().nonnegative(),
    prioritizationFeeLamports: z.number().int().nonnegative(),
    rentFeeLamports: z.number().int().nonnegative(),
    feeBps: z.number().optional(),
    platformFee: z.any().optional()
  }).optional(),

  addressLookupTableAccounts: z.array(z.object({
    key: z.string().describe('ALT account address'),
    state: z.string().describe('Base64 encoded ALT account data')
  })).optional().describe('Address lookup table accounts fetched from RPC')
});

export const swapOutputSchema = z.object({
  swap: z.object({
    route: z.object({
      inputMint: SolanaAddress,
      outputMint: SolanaAddress,
      inAmount: z.string(),
      outAmount: z.string(),
      priceImpactPct: z.string(),
      slippageBps: z.number().optional(),
      marketInfos: z.array(z.any()).optional()
    }),
    fees: z.object({
      signatureFeeLamports: z.number().int().nonnegative(),
      prioritizationFeeLamports: z.number().int().nonnegative(),
      rentFeeLamports: z.number().int().nonnegative(),
      feeBps: z.number().optional()
    }).optional(),
    router: z.string().optional(),
    requestId: z.string().optional()
  })
});
