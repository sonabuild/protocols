/**
 * Enclave-Safe Transaction Utilities
 *
 * SECURITY NOTE: This file is bundled into the enclave.
 * Only include minimal, audited code with NO external dependencies.
 * NO network access, NO filesystem access, NO logging to external services.
 */

// Solana transaction size limits
const MAX_TRANSACTION_SIZE = 1232; // bytes
const WARNING_TRANSACTION_SIZE = 1100; // 90% of max
const MAX_INSTRUCTIONS = 64;

// Export constants
export const TRANSACTION_LIMITS = {
  MAX_SIZE: MAX_TRANSACTION_SIZE,
  WARNING_THRESHOLD: WARNING_TRANSACTION_SIZE,
  MAX_INSTRUCTIONS: MAX_INSTRUCTIONS
};

/**
 * Get transaction size information
 * @param {string} wireTransaction - Base64 encoded transaction
 * @returns {object} { sizeInBytes: number, sizeLimit: number, percentUsed: number }
 */
export function getTransactionInfo(wireTransaction) {
  const decoded = Buffer.from(wireTransaction, 'base64');
  const sizeInBytes = decoded.length;
  const percentUsed = parseFloat(((sizeInBytes / MAX_TRANSACTION_SIZE) * 100).toFixed(1));

  return {
    sizeInBytes,
    sizeLimit: MAX_TRANSACTION_SIZE,
    percentUsed
  };
}

/**
 * Validate transaction size
 * @param {string} wireTransaction - Base64 encoded transaction
 * @param {string} protocolName - Protocol name for error messages
 * @returns {object} { valid: boolean, size?: number, error?: string, warning?: string }
 */
export function validateTransactionSize(wireTransaction, protocolName) {
  if (typeof wireTransaction !== 'string') {
    return {
      valid: false,
      size: 0,
      error: `Invalid transaction: expected base64 string, got ${typeof wireTransaction}`
    };
  }

  // Decode base64 to get actual byte size
  let bytes;
  try {
    const decoded = Buffer.from(wireTransaction, 'base64');
    bytes = decoded.length;
  } catch (error) {
    return {
      valid: false,
      size: 0,
      error: `Invalid base64 transaction: ${error.message}`
    };
  }

  const prefix = protocolName ? `[${protocolName}] ` : '';

  // Check if transaction exceeds maximum size
  if (bytes > MAX_TRANSACTION_SIZE) {
    return {
      valid: false,
      size: bytes,
      error: `${prefix}Transaction size ${bytes} bytes exceeds maximum ${MAX_TRANSACTION_SIZE} bytes`
    };
  }

  // Warn if approaching limit (90%+)
  if (bytes >= WARNING_TRANSACTION_SIZE) {
    const percentUsed = ((bytes / MAX_TRANSACTION_SIZE) * 100).toFixed(0);
    return {
      valid: true,
      size: bytes,
      warning: `${prefix}Transaction size ${bytes} bytes is approaching the limit of ${MAX_TRANSACTION_SIZE} bytes (${percentUsed}% of maximum). Consider optimizing to avoid future issues.`
    };
  }

  return { valid: true, size: bytes };
}

/**
 * Validate instruction count
 * @param {number} count - Number of instructions
 * @param {string} protocolName - Protocol name for error messages
 * @returns {object} { valid: boolean, count?: number, error?: string, warning?: string }
 */
export function validateInstructionCount(count, protocolName) {
  const WARNING_INSTRUCTIONS = 10; // Warn for high instruction count

  const prefix = protocolName ? `[${protocolName}] ` : '';

  // Type validation
  if (typeof count !== 'number') {
    return {
      valid: false,
      error: `${prefix}Invalid instruction count: expected integer, got ${typeof count}`
    };
  }

  if (!Number.isInteger(count)) {
    return {
      valid: false,
      error: `${prefix}Invalid instruction count: expected integer, got ${count}`
    };
  }

  // Range validation
  if (count < 0) {
    return {
      valid: false,
      error: `${prefix}Invalid instruction count: must be non-negative, got ${count}`
    };
  }

  if (count === 0) {
    return {
      valid: false,
      error: `${prefix}Invalid instruction count: transaction must have at least one instruction`
    };
  }

  if (count > MAX_INSTRUCTIONS) {
    return {
      valid: false,
      count,
      error: `${prefix}Instruction count ${count} exceeds maximum ${MAX_INSTRUCTIONS}`
    };
  }

  // Warn for unusually high instruction count
  if (count > WARNING_INSTRUCTIONS) {
    return {
      valid: true,
      count,
      warning: `${prefix}Transaction has unusually high instruction count: ${count} instructions`
    };
  }

  return { valid: true, count };
}
