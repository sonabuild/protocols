import { validateBuiltTransaction } from '../../../shared/enclave/builders.js';

export function buildSwapTransaction(decryptedPayload, prepared, includeAttestation) {
  const { transaction, route, fees, router, requestId } = prepared;

  if (!transaction) {
    throw new Error('No transaction provided by Jupiter Ultra API');
  }

  validateBuiltTransaction(transaction, 'Jupiter Swap');

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
