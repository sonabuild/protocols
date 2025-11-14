/**
 * Common utilities for transaction builders
 *
 * Provides validation and helper functions used across protocol builders
 */

import { validateTransactionSize, validateInstructionCount } from './transactions.js';

/**
 * Validate and log transaction before returning from builder
 * @param {string} wireTransaction - Base64 encoded transaction
 * @param {string} protocolName - Protocol name for logging/errors
 * @param {object} transactionMessage - Transaction message (optional, for instruction count)
 * @throws {Error} If transaction is invalid
 */
export function validateBuiltTransaction(wireTransaction, protocolName, transactionMessage = null) {
  // Validate transaction size
  const sizeValidation = validateTransactionSize(wireTransaction, protocolName);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.error);
  }
  if (sizeValidation.warning) {
    console.warn(`[${protocolName}] ${sizeValidation.warning}`);
  }

  // Validate instruction count if message provided
  if (transactionMessage && transactionMessage.instructions) {
    const instructionCount = transactionMessage.instructions.length;
    const countValidation = validateInstructionCount(instructionCount, protocolName);
    if (!countValidation.valid) {
      throw new Error(countValidation.error);
    }
    if (countValidation.warning) {
      console.warn(`[${protocolName}] ${countValidation.warning}`);
    }
  }

}
