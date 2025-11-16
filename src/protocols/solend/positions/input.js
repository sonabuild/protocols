/**
 * Solend Positions - Query Execution (prep stage)
 *
 * Queries Solend obligation account to get position data
 *
 * IMPORTANT: This runs on the HOST with network access.
 */

import { address, createAddressWithSeed } from '@solana/addresses';
import { validateContextOrigin } from '../../../shared/origin.js';
import { SOLEND_PROGRAM_ID, MAIN_POOL_MARKET } from '../shared/constants.js';

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
 */
function parseObligation(data) {
  // Validate input
  if (!data || !Buffer.isBuffer(data)) {
    console.warn('Invalid obligation data: expected Buffer');
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  // Minimum size check
  if (data.length < OBLIGATION_OFFSETS.MIN_SIZE_FOR_DEPOSITS_LEN) {
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  // Safely read deposits array length
  if (!isValidObligationBounds(data, OBLIGATION_OFFSETS.DEPOSITS_LEN, OBLIGATION_OFFSETS.DEPOSITS_LEN_SIZE)) {
    console.warn('Buffer too small to read depositsLen');
    return {
      deposits: [],
      totalDeposited: '0'
    };
  }

  const depositsLen = data.readUInt16LE(OBLIGATION_OFFSETS.DEPOSITS_LEN);

  // Validate deposits length
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

    // Safety check for this specific deposit entry
    if (!isValidObligationBounds(data, amountOffset, OBLIGATION_OFFSETS.DEPOSIT_AMOUNT_SIZE)) {
      console.warn(`Skipping deposit ${i}: insufficient buffer for amount field`);
      break;
    }

    // Read deposited amount (BigUInt64LE)
    const depositedAmount = data.readBigUInt64LE(amountOffset);

    deposits.push({
      depositedAmount: depositedAmount.toString()
    });
  }

  // For now, return first deposit (USDC)
  const totalDeposited = deposits[0]?.depositedAmount || '0';

  return {
    deposits,
    totalDeposited
  };
}

/**
 * Derive obligation address from wallet
 */
async function deriveObligationFromWallet(walletPubkey) {
  const obligationSeed = String(MAIN_POOL_MARKET).slice(0, 32);
  return await createAddressWithSeed({
    baseAddress: walletPubkey,
    seed: obligationSeed,
    programAddress: SOLEND_PROGRAM_ID
  });
}

/**
 * Prepare positions query (prep stage)
 *
 * @param {object} input - { context: { wallet, origin }, params: {} }
 * @param {object} rpc - Solana RPC client
 * @returns {Promise<object>} Position data matching positionsOutputSchema
 */
export async function preparePositionsInput(input, rpc) {
  const { context } = input;

  // Validate origin
  const originValidation = validateContextOrigin(context, 'Solend Positions');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Solend Positions] ${originValidation.warning}`);
  }

  const userPubkey = address(context.wallet);

  // Derive obligation account
  const obligationAddress = await deriveObligationFromWallet(userPubkey);

  // Fetch obligation account
  const obligationAccount = await rpc.getAccountInfo(
    obligationAddress,
    { encoding: 'base64' }
  ).send();

  if (!obligationAccount || !obligationAccount.value) {
    return {
      obligation: String(obligationAddress),
      exists: false,
      depositedUSDC: '0',
      depositedRaw: 0
    };
  }

  const data = Buffer.from(obligationAccount.value.data[0], 'base64');
  const parsed = parseObligation(data);

  const depositedUSDC = (Number(parsed.totalDeposited) / 1_000_000).toString();

  return {
    obligation: String(obligationAddress),
    exists: true,
    depositedUSDC,
    depositedRaw: Number(parsed.totalDeposited),
    deposits: parsed.deposits
  };
}
