/**
 * Transaction Validation Utilities
 *
 * Provides validation for Solana transaction constraints
 */

// Solana v0 transaction size limits
const MAX_TRANSACTION_SIZE = 1232; // bytes
const WARNING_THRESHOLD = 1100; // Warn if approaching limit (90% of max)
const MAX_INSTRUCTIONS = 64; // Reasonable maximum

/**
 * Validate transaction size
 * @param {string} wireTransaction - Base64 encoded transaction
 * @param {string} protocolName - Protocol name for error messages
 * @returns {{valid: boolean, size: number, error?: string, warning?: string}}
 */
export function validateTransactionSize(wireTransaction, protocolName = 'transaction') {
  if (typeof wireTransaction !== 'string') {
    return {
      valid: false,
      size: 0,
      error: `Invalid transaction format: expected base64 string, got ${typeof wireTransaction}`
    };
  }

  let sizeInBytes;
  try {
    // Decode base64 to get actual byte size
    const decoded = Buffer.from(wireTransaction, 'base64');
    sizeInBytes = decoded.length;
  } catch (error) {
    return {
      valid: false,
      size: 0,
      error: `Failed to decode transaction: ${error.message}`
    };
  }

  // Check if exceeds maximum
  if (sizeInBytes > MAX_TRANSACTION_SIZE) {
    return {
      valid: false,
      size: sizeInBytes,
      error: `Transaction too large: ${sizeInBytes} bytes exceeds maximum ${MAX_TRANSACTION_SIZE} bytes ` +
             `for ${protocolName}. This transaction will be rejected by the Solana network. ` +
             `Consider reducing the number of instructions or accounts.`
    };
  }

  // Check if approaching limit (warning)
  if (sizeInBytes > WARNING_THRESHOLD) {
    return {
      valid: true,
      size: sizeInBytes,
      warning: `Transaction size ${sizeInBytes} bytes is approaching the limit of ${MAX_TRANSACTION_SIZE} bytes ` +
               `(${Math.round((sizeInBytes / MAX_TRANSACTION_SIZE) * 100)}% of maximum). ` +
               `Consider optimizing to avoid future issues.`
    };
  }

  // All good
  return {
    valid: true,
    size: sizeInBytes
  };
}

/**
 * Validate number of instructions in transaction
 * @param {number} instructionCount - Number of instructions
 * @param {string} protocolName - Protocol name for error messages
 * @returns {{valid: boolean, count: number, error?: string, warning?: string}}
 */
export function validateInstructionCount(instructionCount, protocolName = 'transaction') {
  if (typeof instructionCount !== 'number' || !Number.isInteger(instructionCount)) {
    return {
      valid: false,
      count: 0,
      error: `Invalid instruction count: expected integer, got ${typeof instructionCount}`
    };
  }

  if (instructionCount < 0) {
    return {
      valid: false,
      count: instructionCount,
      error: `Invalid instruction count: ${instructionCount} (must be non-negative)`
    };
  }

  if (instructionCount === 0) {
    return {
      valid: false,
      count: 0,
      error: `Invalid transaction: must contain at least one instruction`
    };
  }

  if (instructionCount > MAX_INSTRUCTIONS) {
    return {
      valid: false,
      count: instructionCount,
      error: `Too many instructions: ${instructionCount} exceeds recommended maximum ${MAX_INSTRUCTIONS} ` +
             `for ${protocolName}. This may cause transaction size or computation limits to be exceeded.`
    };
  }

  // Warn if getting high
  if (instructionCount > 10) {
    return {
      valid: true,
      count: instructionCount,
      warning: `Transaction has ${instructionCount} instructions, which is unusually high. ` +
               `Ensure this is necessary to avoid excessive transaction size.`
    };
  }

  return {
    valid: true,
    count: instructionCount
  };
}

/**
 * Get transaction size information
 * @param {string} wireTransaction - Base64 encoded transaction
 * @returns {{sizeInBytes: number, sizeLimit: number, percentUsed: number}}
 */
export function getTransactionInfo(wireTransaction) {
  const decoded = Buffer.from(wireTransaction, 'base64');
  const sizeInBytes = decoded.length;
  const percentUsed = (sizeInBytes / MAX_TRANSACTION_SIZE) * 100;

  return {
    sizeInBytes,
    sizeLimit: MAX_TRANSACTION_SIZE,
    percentUsed: Math.round(percentUsed * 10) / 10 // Round to 1 decimal place
  };
}

/**
 * Constants for external use
 */
export const TRANSACTION_LIMITS = {
  MAX_SIZE: MAX_TRANSACTION_SIZE,
  WARNING_THRESHOLD,
  MAX_INSTRUCTIONS
};
