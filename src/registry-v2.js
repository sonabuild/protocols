/**
 * Pipeline V2 Protocol Registry
 *
 * Maps protocol:operation strings to Pipeline V2 protocol definitions
 */

import jupiterSwap from './protocols/jupiter/swap/index.js';
import walletTransfer from './protocols/wallet/transfer/index.js';
import solendDeposit from './protocols/solend/deposit/index.js';
import solendWithdraw from './protocols/solend/withdraw/index.js';

/**
 * Protocol registry
 * Key format: "protocol:operation"
 */
export const PROTOCOLS = {
  'jupiter:swap': jupiterSwap,
  'wallet:transfer': walletTransfer,
  'solend:deposit': solendDeposit,
  'solend:withdraw': solendWithdraw
};

/**
 * Get protocol definition
 * @param {string} protocol - Protocol name (e.g., "jupiter")
 * @param {string} operation - Operation name (e.g., "swap")
 * @returns {object|null} Protocol definition or null
 */
export function getProtocol(protocol, operation) {
  const key = `${protocol}:${operation}`;
  return PROTOCOLS[key] || null;
}

/**
 * Check if protocol exists
 * @param {string} protocol - Protocol name
 * @param {string} operation - Operation name
 * @returns {boolean}
 */
export function hasProtocol(protocol, operation) {
  const key = `${protocol}:${operation}`;
  return key in PROTOCOLS;
}

/**
 * List all protocols
 * @returns {Array<string>} Array of "protocol:operation" strings
 */
export function listProtocols() {
  return Object.keys(PROTOCOLS);
}
