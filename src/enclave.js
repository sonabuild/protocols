/**
 * Pipeline V2 Enclave Registry
 *
 * Only imports transaction builders - no RPC code
 * Use this entry point in the enclave
 */

import jupiterSwap from './protocols/jupiter/swap/index.js';
import walletTransfer from './protocols/wallet/transfer/index.js';
import solendDeposit from './protocols/solend/deposit/index.js';
import solendWithdraw from './protocols/solend/withdraw/index.js';

const BUILDERS = {
  'solend:deposit': solendDeposit.build,
  'solend:withdraw': solendWithdraw.build,
  'jupiter:swap': jupiterSwap.build,
  'wallet:transfer': walletTransfer.build
};

/**
 * Get builder function
 * @param {string} protocol - Protocol name
 * @param {string} operation - Operation name
 * @returns {Function|null} Builder function or null
 */
export function getBuilder(protocol, operation) {
  const key = `${protocol}:${operation}`;
  return BUILDERS[key] || null;
}

/**
 * Check if builder exists
 * @param {string} protocol - Protocol name
 * @param {string} operation - Operation name
 * @returns {boolean}
 */
export function hasBuilder(protocol, operation) {
  const key = `${protocol}:${operation}`;
  return key in BUILDERS;
}

/**
 * List supported protocols
 * @returns {Array<string>} Array of "protocol:operation" strings
 */
export function listBuilders() {
  return Object.keys(BUILDERS);
}

/**
 * Get supported protocol IDs (unique protocol names)
 * @returns {Array<string>} Array of protocol names
 */
export function getSupportedProtocolIds() {
  const protocols = [];
  const seen = new Set();
  for (const key of Object.keys(BUILDERS)) {
    const [protocol] = key.split(':');
    if (!seen.has(protocol)) {
      seen.add(protocol);
      protocols.push(protocol);
    }
  }
  return protocols;
}

/**
 * Check if protocol is supported
 * @param {string} protocol - Protocol name
 * @returns {boolean}
 */
export function isSupportedProtocol(protocol) {
  return getSupportedProtocolIds().includes(protocol);
}

/**
 * Build protocol transaction (Pipeline V2)
 * @param {object} params
 * @param {string} params.protocol - Protocol name
 * @param {string} params.operation - Operation name
 * @param {object} params.decryptedPayload - Verified secrets from encrypted payload
 * @param {object} params.decryptedPayload.context - User context (wallet, origin)
 * @param {object} params.decryptedPayload.params - Operation parameters
 * @param {object} params.prepared - Pre-fetched data from prep stage
 * @param {boolean} [params.includeAttestation] - Whether to include attestation
 * @returns {Promise<object>} { wireTransaction, ...data }
 */
export async function buildProtocolTransaction({ protocol, operation, decryptedPayload, prepared, includeAttestation }) {
  const builder = getBuilder(protocol, operation);

  if (!builder) {
    throw new Error(`Unsupported protocol: ${protocol}:${operation}`);
  }

  return await builder(decryptedPayload, prepared, includeAttestation);
}
