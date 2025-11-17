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

async function checkAccountsExist(rpc, addresses) {
  const result = await rpc.getMultipleAccounts(addresses).send();

  const existsMap = {};
  result.value.forEach((accountInfo, index) => {
    const key = String(addresses[index]);
    existsMap[key] = accountInfo !== null;
  });

  return existsMap;
}

export async function prepareDepositInput(input, rpc) {
  const { context, params } = input;

  const originValidation = validateContextOrigin(context, 'Solend Deposit');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Solend Deposit] ${originValidation.warning}`);
  }

  const userPubkey = address(context.wallet);

  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: 'finalized' })
    .send();

  const lifetime = {
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
  };

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

  const reserveData = Buffer.from(reserveResult.value.data[0], 'base64');
  const lendingMarketData = Buffer.from(lendingMarketResult.value.data[0], 'base64');

  const userUsdcAta = await getAssociatedTokenAddress(USDC_MINT, userPubkey);
  const userCusdcAta = await getAssociatedTokenAddress(CUSDC_MINT, userPubkey);

  const ataExists = await checkAccountsExist(rpc, [userUsdcAta, userCusdcAta]);
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
