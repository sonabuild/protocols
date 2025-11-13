// Non-attested read operations for Solend obligations

import { address } from '@solana/addresses';

// Solend Obligation account structure offsets (based on Solend Program v1)
const OBLIGATION_OFFSETS = {
  DEPOSITS_LEN: 202,
  DEPOSITS_LEN_SIZE: 2,  // uint16
  DEPOSITS_START: 204,
  DEPOSIT_SIZE: 112,
  DEPOSIT_AMOUNT_OFFSET: 32,  // Offset within each deposit entry
  DEPOSIT_AMOUNT_SIZE: 8,     // BigUInt64LE
  MIN_SIZE_FOR_DEPOSITS_LEN: 204,
  MAX_DEPOSITS: 10  // Reasonable maximum to prevent DoS
};

/**
 * Validate buffer bounds for obligation parsing
 * @param {Buffer} data - Buffer to validate
 * @param {number} offset - Start offset
 * @param {number} length - Number of bytes to read
 * @returns {boolean} True if bounds are valid
 */
function isValidObligationBounds(data, offset, length) {
  if (!data || !Buffer.isBuffer(data)) {
    return false;
  }
  if (offset < 0 || length < 0) {
    return false;
  }
  return (offset + length) <= data.length;
}

/**
 * Parse obligation account data to extract deposit balances
 * @param {Buffer} data - Obligation account data
 * @returns {Object} Parsed obligation with deposits and total
 */
export function parseObligation(data) {
  // Validate input
  if (!data || !Buffer.isBuffer(data)) {
    console.warn('Invalid obligation data: expected Buffer');
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  // Minimum size check - need at least 204 bytes to read depositsLen
  if (data.length < OBLIGATION_OFFSETS.MIN_SIZE_FOR_DEPOSITS_LEN) {
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  // Safely read deposits array length at offset 202
  if (!isValidObligationBounds(data, OBLIGATION_OFFSETS.DEPOSITS_LEN, OBLIGATION_OFFSETS.DEPOSITS_LEN_SIZE)) {
    console.warn('Buffer too small to read depositsLen');
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  const depositsLen = data.readUInt16LE(OBLIGATION_OFFSETS.DEPOSITS_LEN);

  // Validate deposits length is reasonable
  if (depositsLen === 0) {
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  if (depositsLen > OBLIGATION_OFFSETS.MAX_DEPOSITS) {
    console.warn(`Deposits length ${depositsLen} exceeds maximum ${OBLIGATION_OFFSETS.MAX_DEPOSITS}`);
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  const deposits = [];

  // Check if buffer is large enough for all deposits
  const requiredSize = OBLIGATION_OFFSETS.DEPOSITS_START + (depositsLen * OBLIGATION_OFFSETS.DEPOSIT_SIZE);
  if (data.length < requiredSize) {
    console.warn(
      `Buffer too small for deposits: need ${requiredSize} bytes, have ${data.length} bytes`
    );
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  for (let i = 0; i < depositsLen; i++) {
    const depositOffset = OBLIGATION_OFFSETS.DEPOSITS_START + (i * OBLIGATION_OFFSETS.DEPOSIT_SIZE);
    const amountOffset = depositOffset + OBLIGATION_OFFSETS.DEPOSIT_AMOUNT_OFFSET;

    // Safety check for this specific deposit entry's amount field
    if (!isValidObligationBounds(data, amountOffset, OBLIGATION_OFFSETS.DEPOSIT_AMOUNT_SIZE)) {
      console.warn(`Skipping deposit ${i}: insufficient buffer for amount field`);
      break;
    }

    // Read deposited amount (BigUInt64LE)
    const depositedAmount = data.readBigUInt64LE(amountOffset);

    deposits.push({
      depositedAmount: depositedAmount.toString(),
      // Can add more fields here as needed (reserve index, etc.)
    });
  }

  // For now, return first deposit (USDC)
  const totalDeposited = deposits[0]?.depositedAmount || '0';

  return {
    deposits,
    totalDeposited
  };
}

export async function getPosition(rpc, { obligation }) {
  const obligationAccount = await rpc.getAccountInfo(
    address(obligation),
    { encoding: 'base64' }
  ).send();

  if (!obligationAccount || !obligationAccount.value) {
    return {
      exists: false,
      deposited: '0'
    };
  }

  const data = Buffer.from(obligationAccount.value.data[0], 'base64');
  const parsed = parseObligation(data);

  return {
    exists: true,
    deposited: parsed.totalDeposited,
    deposits: parsed.deposits
  };
}
