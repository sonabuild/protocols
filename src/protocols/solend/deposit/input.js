/**
 * Solend Deposit - Input Preparation (prep stage)
 *
 * Prepares context for Solend deposits:
 * - Fetches latest blockhash
 * - Derives obligation account
 * - Derives token accounts (USDC and cUSDC)
 * - Fetches Solend reserve and lending market data
 *
 * IMPORTANT: This runs on the HOST (not in enclave) with network access.
 */

import { address, getAddressEncoder, getProgramDerivedAddress, createAddressWithSeed } from '@solana/addresses';
import { validateContextOrigin } from '../../../shared/origin.js';
import {
  USDC_MINT,
  CUSDC_MINT,
  TOKEN_PROGRAM_ID,
  SOLEND_PROGRAM_ID,
  MAIN_POOL_MARKET,
  USDC_RESERVE
} from '../shared/constants.js';

const ASSOCIATED_TOKEN_PROGRAM_ID = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

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
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
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
 * Prepare deposit input (prep stage)
 *
 * @param {object} input - { context: { wallet, origin }, params: { amount, mint?, symbol? } }
 * @param {object} rpc - Solana RPC client
 * @returns {Promise<object>} Prepared data matching depositEnclaveSchema
 */
export async function prepareDepositInput(input, rpc) {
  const { context, params } = input;

  // Validate origin
  const originValidation = validateContextOrigin(context, 'Solend Deposit');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Solend Deposit] ${originValidation.warning}`);
  }

  const userPubkey = address(context.wallet);

  // 1. Fetch latest blockhash
  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: 'finalized' })
    .send();

  const lifetime = {
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
  };

  // 2. Fetch Solend reserve + lending market accounts
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

  // Extract account data
  const reserveData = Buffer.from(reserveResult.value.data[0], 'base64');
  const lendingMarketData = Buffer.from(lendingMarketResult.value.data[0], 'base64');

  // 3. Derive user token accounts
  const userUsdcAta = await getAssociatedTokenAddress(USDC_MINT, userPubkey);
  const userCusdcAta = await getAssociatedTokenAddress(CUSDC_MINT, userPubkey);

  // Check which ATAs exist
  const ataExists = await checkAccountsExist(rpc, [userUsdcAta, userCusdcAta]);

  // 4. Derive obligation account (Solend uses createAddressWithSeed)
  const obligationSeed = String(MAIN_POOL_MARKET).slice(0, 32);
  const obligationAddress = await createAddressWithSeed({
    baseAddress: userPubkey,
    seed: obligationSeed,
    programAddress: SOLEND_PROGRAM_ID
  });

  // Check if obligation account exists
  const obligationResult = await rpc
    .getAccountInfo(obligationAddress, { encoding: 'base64' })
    .send();
  const hasObligation = obligationResult.value !== null;

  return {
    lifetime,
    userUsdcAta: String(userUsdcAta),
    userCusdcAta: String(userCusdcAta),
    usdcAtaExists: ataExists[String(userUsdcAta)],
    cusdcAtaExists: ataExists[String(userCusdcAta)],
    obligationAccount: String(obligationAddress),
    obligationExists: hasObligation,
    accounts: {
      reserve: {
        address: String(USDC_RESERVE),
        data: Array.from(reserveData)
      },
      lendingMarket: {
        address: String(MAIN_POOL_MARKET),
        data: Array.from(lendingMarketData)
      }
    }
  };
}
