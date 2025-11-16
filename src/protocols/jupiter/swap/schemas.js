/**
 * Jupiter Swap - Business Schemas
 * Pipeline V2 structure
 */
import { z } from 'zod';

/**
 * Input schema - what the user provides
 */
export const swapInputSchema = z.object({
  inputMint: z.string()
    .describe('Input token mint address on Solana'),

  outputMint: z.string()
    .describe('Output token mint address on Solana'),

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

/**
 * Enclave schema - what prep step returns
 * This is the prepared data from Jupiter Ultra API
 */
export const swapEnclaveSchema = z.object({
  lifetime: z.object({
    blockhash: z.string(),
    lastValidBlockHeight: z.number()
  }),
  userInputAta: z.string().describe('User input token ATA'),
  userOutputAta: z.string().describe('User output token ATA'),
  route: z.object({
    inputMint: z.string(),
    outputMint: z.string(),
    inAmount: z.string(),
    outAmount: z.string(),
    priceImpactPct: z.string(),
    slippageBps: z.number().optional(),
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
});

/**
 * Output schema - protocol-specific response data
 */
export const swapOutputSchema = z.object({
  swap: z.object({
    route: z.object({
      inputMint: z.string(),
      outputMint: z.string(),
      inAmount: z.string(),
      outAmount: z.string(),
      priceImpactPct: z.string(),
      slippageBps: z.number().optional(),
      marketInfos: z.array(z.any()).optional()
    }),
    fees: z.object({
      signatureFeeLamports: z.number(),
      prioritizationFeeLamports: z.number(),
      rentFeeLamports: z.number(),
      feeBps: z.number().optional()
    }).optional(),
    router: z.string().optional(),
    requestId: z.string().optional()
  })
});
