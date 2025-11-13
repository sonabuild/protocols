/**
 * Safe Amount Conversion Utilities
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
 * Safely convert raw units to human-readable amount
 * @param {number|bigint|string} rawAmount - Raw amount in smallest units
 * @param {number} decimals - Number of decimals
 * @param {string} tokenSymbol - Token symbol for error messages
 * @returns {string} Human-readable amount as string (to preserve precision)
 */
export function safeRawToAmount(rawAmount, decimals, tokenSymbol = 'token') {
  // Validate decimals
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(`Invalid decimals for ${tokenSymbol}: must be integer between 0 and 18, got ${decimals}`);
  }

  // Convert to BigInt if needed
  let raw;
  if (typeof rawAmount === 'bigint') {
    raw = rawAmount;
  } else if (typeof rawAmount === 'string') {
    try {
      raw = BigInt(rawAmount);
    } catch (e) {
      throw new Error(`Invalid raw amount for ${tokenSymbol}: cannot parse "${rawAmount}" as BigInt`);
    }
  } else if (typeof rawAmount === 'number') {
    if (!Number.isSafeInteger(rawAmount)) {
      throw new Error(`Invalid raw amount for ${tokenSymbol}: ${rawAmount} is not safe integer`);
    }
    if (rawAmount < 0) {
      throw new Error(`Invalid raw amount for ${tokenSymbol}: must be non-negative integer, got ${rawAmount}`);
    }
    raw = BigInt(rawAmount);
  } else {
    throw new Error(`Invalid raw amount for ${tokenSymbol}: must be number, bigint, or string, got ${typeof rawAmount}`);
  }

  // Validate raw amount is non-negative
  if (raw < 0n) {
    throw new Error(`Invalid raw amount for ${tokenSymbol}: must be non-negative, got ${raw}`);
  }

  // Convert using string manipulation to avoid precision loss
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = raw / divisor;
  const fractionalPart = raw % divisor;

  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');

  // Remove trailing zeros from fractional part
  const trimmedFractional = fractionalStr.replace(/0+$/, '');

  if (trimmedFractional === '') {
    return wholePart.toString();
  } else {
    return `${wholePart}.${trimmedFractional}`;
  }
}

/**
 * Validate that an amount is within safe bounds
 * @param {number} amount - Amount to validate
 * @param {number} decimals - Number of decimals
 * @param {string} tokenSymbol - Token symbol for error messages
 * @returns {boolean} True if amount is safe
 */
export function isAmountSafe(amount, decimals, tokenSymbol = 'token') {
  try {
    safeAmountToRaw(amount, decimals, tokenSymbol);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get maximum safe amount for a given decimal count
 * @param {number} decimals - Number of decimals
 * @returns {number} Maximum safe amount
 */
export function getMaxSafeAmount(decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(`Invalid decimals: must be integer between 0 and 18, got ${decimals}`);
  }
  return MAX_SAFE_AMOUNTS[decimals];
}
