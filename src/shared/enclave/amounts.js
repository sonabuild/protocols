/**
 * Enclave-Safe Amount Conversion Utilities
 *
 * SECURITY NOTE: This file is bundled into the enclave.
 * Only include minimal, audited code with NO external dependencies.
 * NO network access, NO filesystem access, NO logging to external services.
 *
 * Provides overflow-safe conversions between human-readable amounts
 * and blockchain raw units (lamports, smallest token units, etc.)
 */

// JavaScript's Number.MAX_SAFE_INTEGER (2^53 - 1)
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

// Maximum safe amount per token decimals (to prevent overflow)
// For each decimal count, calculate: MAX_SAFE_INTEGER / 10^decimals
export const MAX_SAFE_AMOUNTS = {
  0: MAX_SAFE_INTEGER,              // For tokens with 0 decimals
  1: 900_719_925_474_099.1,         // 10^1
  2: 90_071_992_547_409.91,         // 10^2
  3: 9_007_199_254_740.991,         // 10^3
  4: 900_719_925_474.0991,          // 10^4
  5: 90_071_992_547.40991,          // 10^5
  6: 9_007_199_254.740991,          // 10^6 (USDC, USDT)
  7: 900_719_925.4740991,           // 10^7
  8: 90_071_992.54740991,           // 10^8 (BTC-style)
  9: 9_007_199.254740991,           // 10^9 (SOL)
  10: 900_719.9254740991,           // 10^10
  11: 90_071.99254740991,           // 10^11
  12: 9_007.199254740991,           // 10^12
  13: 900.7199254740991,            // 10^13
  14: 90.07199254740991,            // 10^14
  15: 9.007199254740991,            // 10^15
  16: 0.9007199254740991,           // 10^16
  17: 0.09007199254740991,          // 10^17
  18: 0.009007199254740991          // 10^18 (ETH-style)
};

/**
 * Safely convert human-readable amount to raw units
 * @param {number} amount - Human-readable amount (e.g., 1.5 SOL)
 * @param {number} decimals - Number of decimals (e.g., 9 for SOL)
 * @param {string} tokenSymbol - Token symbol for error messages
 * @returns {number} Raw amount in smallest units (e.g., lamports)
 * @throws {Error} If amount would cause integer overflow
 */
export function safeAmountToRaw(amount, decimals, tokenSymbol = 'token') {
  // Validate inputs
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`Invalid amount for ${tokenSymbol}: must be a number, got ${typeof amount}`);
  }

  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid amount for ${tokenSymbol}: must be finite, got ${amount}`);
  }

  if (amount < 0) {
    throw new Error(`Invalid amount for ${tokenSymbol}: must be non-negative, got ${amount}`);
  }

  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(`Invalid decimals for ${tokenSymbol}: must be integer between 0 and 18, got ${decimals}`);
  }

  // Check if amount would cause overflow
  const maxSafeAmount = MAX_SAFE_AMOUNTS[decimals];
  if (amount > maxSafeAmount) {
    throw new Error(
      `Amount overflow for ${tokenSymbol}: ${amount} exceeds maximum safe amount ` +
      `${maxSafeAmount.toFixed(decimals)} for ${decimals} decimals. ` +
      `This would result in precision loss or incorrect calculations.`
    );
  }

  // Perform conversion
  const multiplier = Math.pow(10, decimals);
  const rawAmount = Math.floor(amount * multiplier);

  // Final safety check (should never trigger if logic above is correct)
  if (!Number.isSafeInteger(rawAmount)) {
    throw new Error(
      `Integer overflow converting ${amount} ${tokenSymbol} to raw units. ` +
      `Result ${rawAmount} exceeds MAX_SAFE_INTEGER.`
    );
  }

  return rawAmount;
}

/**
 * Convert raw units to human-readable amount (returns string for precision)
 * @param {number|bigint|string} rawAmount - Raw amount in smallest units
 * @param {number} decimals - Number of decimals
 * @param {string} tokenSymbol - Token symbol for error messages
 * @returns {string} Human-readable amount as string (for precision)
 * @throws {Error} If inputs are invalid
 */
export function safeRawToAmount(rawAmount, decimals, tokenSymbol = 'token') {
  // Validate decimals
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(`Invalid decimals for ${tokenSymbol}: must be integer between 0 and 18, got ${decimals}`);
  }

  // Convert to BigInt if needed
  let bigIntAmount;

  if (typeof rawAmount === 'bigint') {
    bigIntAmount = rawAmount;
  } else if (typeof rawAmount === 'string') {
    try {
      bigIntAmount = BigInt(rawAmount);
    } catch (error) {
      throw new Error(`Invalid raw amount for ${tokenSymbol}: cannot parse string "${rawAmount}" as BigInt`);
    }
  } else if (typeof rawAmount === 'number') {
    if (!Number.isSafeInteger(rawAmount)) {
      throw new Error(`Invalid raw amount for ${tokenSymbol}: number ${rawAmount} is not safe integer`);
    }
    bigIntAmount = BigInt(rawAmount);
  } else {
    throw new Error(`Invalid raw amount for ${tokenSymbol}: must be number, bigint, or string, got ${typeof rawAmount}`);
  }

  // Check for negative
  if (bigIntAmount < 0n) {
    throw new Error(`Invalid raw amount for ${tokenSymbol}: must be non-negative, got ${bigIntAmount}`);
  }

  // Perform conversion using string manipulation for precision
  const rawStr = bigIntAmount.toString();
  const divisor = 10 ** decimals;

  if (decimals === 0) {
    return rawStr;
  }

  // Pad with leading zeros if needed
  const paddedStr = rawStr.padStart(decimals + 1, '0');
  const integerPart = paddedStr.slice(0, -decimals) || '0';
  const decimalPart = paddedStr.slice(-decimals);

  // Remove trailing zeros from decimal part
  const trimmedDecimal = decimalPart.replace(/0+$/, '');

  if (trimmedDecimal === '') {
    return integerPart;
  }

  return `${integerPart}.${trimmedDecimal}`;
}

/**
 * Check if an amount is safe for conversion
 * @param {number} amount - Human-readable amount
 * @param {number} decimals - Number of decimals
 * @param {string} tokenSymbol - Token symbol for error messages
 * @returns {boolean} True if amount is safe
 */
export function isAmountSafe(amount, decimals, tokenSymbol = 'token') {
  try {
    // Validate inputs
    if (typeof amount !== 'number' || isNaN(amount) || !Number.isFinite(amount)) {
      return false;
    }
    if (amount < 0) {
      return false;
    }
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      return false;
    }

    // Check if amount would cause overflow
    const maxSafeAmount = MAX_SAFE_AMOUNTS[decimals];
    if (amount > maxSafeAmount) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the maximum safe amount for a given number of decimals
 * @param {number} decimals - Number of decimals
 * @returns {number} Maximum safe amount
 * @throws {Error} If decimals is invalid
 */
export function getMaxSafeAmount(decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(`Invalid decimals: must be integer between 0 and 18, got ${decimals}`);
  }
  return MAX_SAFE_AMOUNTS[decimals];
}
