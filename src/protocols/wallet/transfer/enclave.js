import { buildWalletTransferTransaction as legacyBuild } from '../enclave/transfer.js';

export function buildTransferTransaction(decryptedPayload, preparedData, includeAttestation) {
  const { context, params } = decryptedPayload;
  return legacyBuild({ context, params, prepared: preparedData });
}
