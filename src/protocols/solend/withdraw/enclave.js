import { buildWithdrawTransaction as legacyBuild } from '../enclave/withdraw.js';

export function buildWithdrawTransaction(decryptedPayload, preparedData, includeAttestation) {
  const { context, params } = decryptedPayload;
  return legacyBuild(params, context, preparedData);
}
