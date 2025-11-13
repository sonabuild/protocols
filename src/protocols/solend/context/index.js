/**
 * Solend context preparation (host-only)
 *
 * Fetches RPC data and prepares context for transaction building.
 * Do not import in enclave.
 */

import { address, getAddressCodec, getProgramDerivedAddress, getAddressEncoder, createAddressWithSeed } from '@solana/addresses';
import {
  USDC_MINT,
  CUSDC_MINT,
  TOKEN_PROGRAM_ID,
  SOLEND_PROGRAM_ID,
  MAIN_POOL_MARKET,
  USDC_RESERVE
} from '../shared/constants.js';
import { parseReserveAccount, parseLendingMarketAccount } from './parser.js';
import { validateContextOrigin } from '../../../shared/origin.js';

/**
 * Derive Solend obligation address from wallet public key
 * This is the canonical way to derive a user's obligation account
 * @param {Address} walletPubkey - User's wallet public key
 * @returns {Promise<Address>} The derived obligation address
 */
export async function deriveObligationFromWallet(walletPubkey) {
  const obligationSeed = String(MAIN_POOL_MARKET).slice(0, 32);
  return await createAddressWithSeed({
    baseAddress: walletPubkey,
    seed: obligationSeed,
    programAddress: SOLEND_PROGRAM_ID
  });
}

/**
 * Derive Associated Token Address
 */
async function getAssociatedTokenAddress(mint, owner) {
  const encoder = getAddressEncoder();
  const seeds = [
    encoder.encode(owner),
    encoder.encode(TOKEN_PROGRAM_ID),
    encoder.encode(mint)
  ];

  const [ata] = await getProgramDerivedAddress({
    programAddress: address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
    seeds
  });

  return ata;
}

/**
 * Check which addresses exist on-chain
 */
async function checkAccountsExist(rpc, addresses) {
  const result = await rpc.getMultipleAccounts(addresses).send();

  const existsMap = {};
  result.value.forEach((accountInfo, index) => {
    const key = String(addresses[index]);
    existsMap[key] = accountInfo !== null;
  });

  return existsMap;
}

/**
 * Prepare context for Solend transaction building
 *
 * @param {Object} config
 * @param {Object} config.rpc - Solana RPC client
 * @param {Object} config.context - Context object with wallet and origin
 * @param {Object} config.params - Operation params (amount, etc.)
 * @returns {Promise<Object>} Context matching SolendContextSchema
 */
export async function prepareSolendContext({ rpc, context, params }) {
  // Validate origin
  const originValidation = validateContextOrigin(context, 'Solend context preparation');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Solend Context] ${originValidation.warning}`);
  }

  const userPubkey = address(context.wallet);
  const addressCodec = getAddressCodec();
  const addressEncoder = getAddressEncoder();

  // Fetch blockhash
  const { value: lifetime } = await rpc.getLatestBlockhash({ commitment: 'finalized' }).send();

  // Fetch Solend reserve + lending market accounts
  const [reserveResult, lendingMarketResult] = await Promise.all([
    rpc.getAccountInfo(USDC_RESERVE, { encoding: 'base64' }).send(),
    rpc.getAccountInfo(MAIN_POOL_MARKET, { encoding: 'base64' }).send()
  ]);

  if (!reserveResult.value) {
    throw new Error(`Solend reserve account not found: ${USDC_RESERVE}`);
  }

  if (!lendingMarketResult.value) {
    throw new Error(`Solend lending market account not found: ${MAIN_POOL_MARKET}`);
  }

  // Extract and parse account data
  const reserveData = Buffer.from(reserveResult.value.data[0], 'base64');
  const lendingMarketData = Buffer.from(lendingMarketResult.value.data[0], 'base64');

  parseLendingMarketAccount(lendingMarketData); // Validate format

  // Use hardcoded CUSDC mint (parser offsets are outdated)
  const reserveCollateralMint = CUSDC_MINT;

  // Derive ATAs
  const userUsdcAta = await getAssociatedTokenAddress(USDC_MINT, userPubkey);
  const userCollateralAta = await getAssociatedTokenAddress(reserveCollateralMint, userPubkey);

  // Check which ATAs exist
  const ataExists = await checkAccountsExist(rpc, [userUsdcAta, userCollateralAta]);

  // Derive obligation account (Solend uses createAddressWithSeed)
  const obligationSeed = String(MAIN_POOL_MARKET).slice(0, 32);
  const obligationAddress = await createAddressWithSeed({
    baseAddress: userPubkey,
    seed: obligationSeed,
    programAddress: SOLEND_PROGRAM_ID
  });

  // Check if obligation account exists
  const obligationResult = await rpc.getAccountInfo(obligationAddress, { encoding: 'base64' }).send();
  const hasObligation = obligationResult.value !== null;

  return {
    lifetime,
    userUsdcAta,
    userCusdcAta: userCollateralAta,
    usdcAtaExists: ataExists[String(userUsdcAta)],
    cusdcAtaExists: ataExists[String(userCollateralAta)],
    obligationAccount: obligationAddress, // Always return the address (even if account doesn't exist yet)
    obligationExists: hasObligation,
    accounts: {
      reserve: {
        address: USDC_RESERVE,
        data: Array.from(reserveData)
      },
      lendingMarket: {
        address: MAIN_POOL_MARKET,
        data: Array.from(lendingMarketData)
      }
    }
  };
}
