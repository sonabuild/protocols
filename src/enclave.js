/**
 * Enclave-safe protocol registry
 *
 * Only imports transaction builders - no RPC code.
 * Use this entry point in the enclave instead of the main index.
 */

import { buildSolendTransaction } from './protocols/solend/enclave/index.js';
import { buildJupiterTransaction } from './protocols/jupiter/enclave/index.js';
import { buildWalletTransaction } from './protocols/wallet/enclave/index.js';

const builders = new Map([
  ['solend', buildSolendTransaction],
  ['jupiter', buildJupiterTransaction],
  ['wallet', buildWalletTransaction]
]);

function getBuilderOrThrow(id) {
  if (!builders.has(id)) {
    throw new Error(`Unsupported protocol: ${id}`);
  }
  return builders.get(id);
}

export function getSupportedProtocolIds() {
  return Array.from(builders.keys());
}

export function isSupportedProtocol(id) {
  return builders.has(id);
}

export async function buildProtocolTransaction({ protocol, context, params, prepared }) {
  const builder = getBuilderOrThrow(protocol);
  return builder({ context, params, prepared });
}
