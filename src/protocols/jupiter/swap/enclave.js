/**
 * Jupiter Swap - Enclave Builder (build stage)
 * Pipeline V2 structure
 *
 * PURE FUNCTION - NO SIDE EFFECTS
 * - No network access
 * - No file system access
 * - Takes pre-fetched data
 *
 * This runs inside the AWS Nitro Enclave with attestation.
 */
import { validateBuiltTransaction } from '../../../shared/builders.js';

/**
 * Build Jupiter swap transaction
 * Jupiter Ultra API provides a complete pre-built transaction
 *
 * @param {object} decryptedPayload - Verified secrets from encrypted payload
 * @param {object} decryptedPayload.envelope - Security envelope { t, rid, origin }
 * @param {object} decryptedPayload.context - User context { wallet, origin }
 * @param {object} decryptedPayload.params - Protocol-specific parameters
 * @param {object} preparedData - Validated data from prep step
 * @param {boolean} includeAttestation - Whether to include attestation
 * @returns {object} { wireTransaction, ...data }
 */
export function buildSwapTransaction(decryptedPayload, preparedData, includeAttestation) {
  const { context, params } = decryptedPayload;
  const { transaction, route, fees, router, requestId } = preparedData;

  // Jupiter Ultra API returns a complete pre-built transaction
  // We validate it matches the user's request and return it

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
      fees: fees ? {
        signatureFeeLamports: fees.signatureFeeLamports,
        prioritizationFeeLamports: fees.prioritizationFeeLamports,
        rentFeeLamports: fees.rentFeeLamports,
        feeBps: fees.feeBps
      } : undefined,
      router,
      requestId
    }
  };
}
