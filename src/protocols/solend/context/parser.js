// Parse Solend on-chain account data - pure functions, no external dependencies

/**
 * Validate buffer bounds before reading
 * @param {Buffer} data - Buffer to validate
 * @param {number} offset - Start offset
 * @param {number} length - Number of bytes to read
 * @param {string} fieldName - Name of field being read (for error messages)
 * @throws {Error} If bounds check fails
 */
function validateBufferBounds(data, offset, length, fieldName) {
  if (!data || !Buffer.isBuffer(data)) {
    throw new Error(`Invalid buffer: expected Buffer for ${fieldName}`);
  }

  if (offset < 0) {
    throw new Error(`Invalid offset for ${fieldName}: ${offset} (must be >= 0)`);
  }

  if (length < 0) {
    throw new Error(`Invalid length for ${fieldName}: ${length} (must be >= 0)`);
  }

  const endOffset = offset + length;
  if (endOffset > data.length) {
    throw new Error(
      `Buffer overflow reading ${fieldName}: tried to read ${length} bytes at offset ${offset} ` +
      `(end: ${endOffset}) but buffer length is ${data.length}`
    );
  }
}

/**
 * Safely read a uint8 from buffer with bounds checking
 * @param {Buffer} data - Buffer to read from
 * @param {number} offset - Offset to read at
 * @param {string} fieldName - Name of field (for error messages)
 * @returns {number} The uint8 value
 */
function safeReadUInt8(data, offset, fieldName) {
  validateBufferBounds(data, offset, 1, fieldName);
  return data.readUInt8(offset);
}

/**
 * Safely slice buffer with bounds checking
 * @param {Buffer} data - Buffer to slice
 * @param {number} start - Start offset
 * @param {number} end - End offset (exclusive)
 * @param {string} fieldName - Name of field (for error messages)
 * @returns {Buffer} The sliced buffer
 */
function safeSlice(data, start, end, fieldName) {
  validateBufferBounds(data, start, end - start, fieldName);
  return data.slice(start, end);
}

// Solend Reserve account structure offsets (based on Solend Program v1)
const RESERVE_OFFSETS = {
  VERSION: 0,
  LIQUIDITY_SUPPLY_PUBKEY: 74,
  LIQUIDITY_SUPPLY_PUBKEY_END: 106,
  COLLATERAL_MINT_PUBKEY: 221,
  COLLATERAL_MINT_PUBKEY_END: 253,
  COLLATERAL_SUPPLY_PUBKEY: 253,
  COLLATERAL_SUPPLY_PUBKEY_END: 285,
  MIN_SIZE: 619  // Minimum expected size for Reserve account
};

/**
 * Parse Reserve account data based on Solend's struct layout
 * @param {Buffer} data - Reserve account data
 * @returns {Object} Parsed reserve data
 * @throws {Error} If data is invalid or buffer bounds are violated
 */
export function parseReserveAccount(data) {
  // Validate minimum buffer size
  if (!data || !Buffer.isBuffer(data)) {
    throw new Error('Invalid reserve account data: expected Buffer');
  }

  if (data.length < RESERVE_OFFSETS.MIN_SIZE) {
    throw new Error(
      `Invalid reserve account data: expected at least ${RESERVE_OFFSETS.MIN_SIZE} bytes, ` +
      `got ${data.length} bytes`
    );
  }

  // Read version with bounds checking
  const version = safeReadUInt8(data, RESERVE_OFFSETS.VERSION, 'version');

  // Read liquidity supply pubkey (32 bytes)
  const liquiditySupplyPubkey = safeSlice(
    data,
    RESERVE_OFFSETS.LIQUIDITY_SUPPLY_PUBKEY,
    RESERVE_OFFSETS.LIQUIDITY_SUPPLY_PUBKEY_END,
    'liquiditySupplyPubkey'
  );

  // Read collateral mint pubkey (32 bytes)
  const collateralMintPubkey = safeSlice(
    data,
    RESERVE_OFFSETS.COLLATERAL_MINT_PUBKEY,
    RESERVE_OFFSETS.COLLATERAL_MINT_PUBKEY_END,
    'collateralMintPubkey'
  );

  // Read collateral supply pubkey (32 bytes)
  const collateralSupplyPubkey = safeSlice(
    data,
    RESERVE_OFFSETS.COLLATERAL_SUPPLY_PUBKEY,
    RESERVE_OFFSETS.COLLATERAL_SUPPLY_PUBKEY_END,
    'collateralSupplyPubkey'
  );

  return {
    version,
    liquiditySupplyPubkey,
    collateralMintPubkey,
    collateralSupplyPubkey
  };
}

// Solend LendingMarket account structure offsets (based on Solend Program v1)
const LENDING_MARKET_OFFSETS = {
  VERSION: 0,
  BUMP_SEED: 1,
  OWNER: 2,
  OWNER_END: 34,
  MIN_SIZE: 258  // Minimum expected size for LendingMarket account
};

/**
 * Parse LendingMarket account data based on Solend's struct layout
 * @param {Buffer} data - LendingMarket account data
 * @returns {Object} Parsed lending market data
 * @throws {Error} If data is invalid or buffer bounds are violated
 */
export function parseLendingMarketAccount(data) {
  // Validate minimum buffer size
  if (!data || !Buffer.isBuffer(data)) {
    throw new Error('Invalid lending market account data: expected Buffer');
  }

  if (data.length < LENDING_MARKET_OFFSETS.MIN_SIZE) {
    throw new Error(
      `Invalid lending market account data: expected at least ${LENDING_MARKET_OFFSETS.MIN_SIZE} bytes, ` +
      `got ${data.length} bytes`
    );
  }

  // Read version with bounds checking
  const version = safeReadUInt8(data, LENDING_MARKET_OFFSETS.VERSION, 'version');

  // Read bump seed with bounds checking
  const bumpSeed = safeReadUInt8(data, LENDING_MARKET_OFFSETS.BUMP_SEED, 'bumpSeed');

  // Read owner pubkey (32 bytes) with bounds checking
  const owner = safeSlice(
    data,
    LENDING_MARKET_OFFSETS.OWNER,
    LENDING_MARKET_OFFSETS.OWNER_END,
    'owner'
  );

  return {
    version,
    bumpSeed,
    owner
  };
}
