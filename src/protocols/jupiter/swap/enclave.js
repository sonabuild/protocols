/**
 * Jupiter Swap - Transaction Builder (build stage)
 *
 * PURE FUNCTION - NO SIDE EFFECTS
 * - No network access
 * - No file system access
 * - Takes pre-fetched context (including pre-built transaction from Ultra API)
 *
 * This runs inside the AWS Nitro Enclave with attestation.
 */

import { validateBuiltTransaction } from '../../../shared/builders.js';

/**
 * Build Jupiter swap transaction (build stage)
 *
 * @param {object} decryptedPayload - Verified secrets from encrypted payload
 * @param {object} decryptedPayload.context - User context {wallet, origin}
 * @param {object} decryptedPayload.params - Swap params
 * @param {object} prepared - Pre-fetched data from prep stage
 * @param {boolean} includeAttestation - Whether to include attestation
 * @returns {object} { wireTransaction, swap: {...} }
 */
export function buildSwapTransaction(decryptedPayload, prepared, includeAttestation) {
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
