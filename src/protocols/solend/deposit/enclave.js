import { buildDepositTransaction as legacyBuild } from '../enclave/deposit.js';

export function buildDepositTransaction(decryptedPayload, preparedData, includeAttestation) {
  const { context, params } = decryptedPayload;
  return legacyBuild(params, context, preparedData);
}
