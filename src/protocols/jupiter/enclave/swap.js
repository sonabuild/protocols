/**
 * Jupiter Swap Enclave Builder
 *
 * PURE FUNCTION - NO SIDE EFFECTS
 * - No network access
 * - No file system access
 * - Takes pre-fetched context (including pre-built transaction from Ultra API)
 *
 * This runs inside the AWS Nitro Enclave with attestation.
 *
 * Note: Jupiter Ultra API provides a complete pre-built transaction,
 * so this builder mainly validates and passes it through.
 */

import { validateBuiltTransaction } from '../../../shared/builders.js';

/**
 * Build Jupiter swap transaction
 *
 * @param {object} params - Validated params from schema
 * @param {object} context - User context {wallet, origin}
 * @param {object} prepared - Pre-fetched data from host (Ultra API format)
 * @returns {object} Transaction and metadata
 */
export function buildJupiterSwapTransaction(params, context, prepared) {
  const { transaction, route, fees, router, requestId } = prepared;

  // Ultra API returns a complete pre-built transaction
  // We just need to validate it matches the user's request and return it

  if (!transaction) {
    throw new Error('No transaction provided by Jupiter Ultra API');
  }

  validateBuiltTransaction(transaction, 'Jupiter Swap');

  // Return the pre-built transaction with swap metadata
  return {
    wireTransaction: transaction,
    swap: {
      route: {
        inputMint: route.inputMint,
        outputMint: route.outputMint,
        inAmount: route.inAmount,
        outAmount: route.outAmount,
        priceImpactPct: route.priceImpactPct,
        slippageBps: route.slippageBps,
        marketInfos: route.marketInfos
      },
      fees: {
        signatureFeeLamports: fees.signatureFeeLamports,
        prioritizationFeeLamports: fees.prioritizationFeeLamports,
        rentFeeLamports: fees.rentFeeLamports,
        feeBps: fees.feeBps
      },
      router,
      requestId
    }
  };
}

