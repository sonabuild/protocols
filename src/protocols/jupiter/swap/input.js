/**
 * Jupiter Swap - Input Preparation (prep stage)
 *
 * Handles all network operations:
 * - Fetches latest blockhash
 * - Calls Jupiter Ultra API for swap route
 * - Derives token accounts
 *
 * IMPORTANT: This runs on the HOST (not in enclave) with network access.
 */

import { address, getAddressEncoder, getProgramDerivedAddress } from '@solana/addresses';
import { validateContextOrigin } from '../../../shared/origin.js';
import { safeAmountToRaw } from '../../../shared/amounts.js';

const JUPITER_ULTRA_API = process.env.JUPITER_API_URL || 'https://lite-api.jup.ag/ultra/v1';
const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
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
 * Get token decimals for known tokens
 */
function getTokenDecimals(mint) {
  const knownDecimals = {
    'So11111111111111111111111111111111111111112': 9, // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 6, // JUP
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5  // BONK
  };
  return knownDecimals[mint] || 9;
}

/**
 * Get token symbol from mint address
 */
function getMintSymbol(mint) {
  const knownSymbols = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK'
  };
  return knownSymbols[mint] || mint.slice(0, 4) + '...' + mint.slice(-4);
}

/**
 * Prepare swap input (prep stage)
 *
 * @param {object} input - { context: { wallet, origin }, params: { inputMint, outputMint, amount, slippageBps } }
 * @param {object} rpc - Solana RPC client
 * @returns {Promise<object>} Prepared data matching swapEnclaveSchema
 */
export async function prepareSwapInput(input, rpc) {
  const { context, params } = input;

  // Validate origin
  const originValidation = validateContextOrigin(context, 'Jupiter Swap');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Jupiter] ${originValidation.warning}`);
  }

  const { inputMint, outputMint, amount, slippageBps = 50 } = params;
  const userAddress = address(context.wallet);

  // 1. Fetch latest blockhash
  const { value: lifetime } = await rpc
    .getLatestBlockhash({ commitment: 'finalized' })
    .send();

  // 2. Convert amount to lamports with overflow protection
  const inputMintAddr = address(inputMint);
  const outputMintAddr = address(outputMint);
  const inputDecimals = getTokenDecimals(inputMint);
  const inputSymbol = getMintSymbol(inputMint);

  let amountLamports;
  try {
    amountLamports = safeAmountToRaw(amount, inputDecimals, inputSymbol);
  } catch (error) {
    throw new Error(`Amount conversion failed for ${inputSymbol}: ${error.message}`);
  }

  // 3. Call Jupiter Ultra API
  const orderUrl = new URL(`${JUPITER_ULTRA_API}/order`);
  orderUrl.searchParams.set('inputMint', inputMint);
  orderUrl.searchParams.set('outputMint', outputMint);
  orderUrl.searchParams.set('amount', amountLamports.toString());
  orderUrl.searchParams.set('taker', context.wallet);
  if (slippageBps) {
    orderUrl.searchParams.set('slippageBps', slippageBps.toString());
  }

  const orderResponse = await fetch(orderUrl.toString());
  const orderData = await orderResponse.json();

  // Validate Jupiter API response
  if (!orderData || typeof orderData !== 'object') {
    throw new Error('Jupiter API returned invalid response');
  }
  if (orderData.error) {
    throw new Error(`Jupiter order error: ${orderData.error}`);
  }
  if (!orderData.transaction) {
    if (orderData.errorCode === 1) throw new Error('Insufficient funds for swap');
    if (orderData.errorCode === 2) throw new Error('Top up SOL for gas fees');
    if (orderData.errorCode === 3) throw new Error('Minimum swap amount not met');
    throw new Error('No transaction returned from Jupiter order');
  }

  // Validate transaction format
  if (typeof orderData.transaction !== 'string' || orderData.transaction.length === 0) {
    throw new Error('Invalid transaction format');
  }

  try {
    const decoded = Buffer.from(orderData.transaction, 'base64');
    if (decoded.length < 64) {
      throw new Error(`Transaction too small: ${decoded.length} bytes`);
    }
    if (decoded.length > 1232) {
      throw new Error(`Transaction too large: ${decoded.length} bytes`);
    }
  } catch (error) {
    if (error.message.includes('Transaction too')) throw error;
    throw new Error(`Invalid base64 transaction: ${error.message}`);
  }

  // 4. Derive user token accounts
  const userInputAta = await getAssociatedTokenAddress(inputMintAddr, userAddress);
  const userOutputAta = await getAssociatedTokenAddress(outputMintAddr, userAddress);

  // 5. Return prepared data (matches swapEnclaveSchema)
  return {
    lifetime,
    userInputAta,
    userOutputAta,
    route: {
      inputMint: orderData.inputMint || inputMint,
      outputMint: orderData.outputMint || outputMint,
      inAmount: orderData.inAmount,
      outAmount: orderData.outAmount,
      priceImpactPct: orderData.priceImpactPct || orderData.priceImpact,
      slippageBps: orderData.slippageBps,
      marketInfos: orderData.routePlan?.map(plan => ({
        id: plan.ammKey || plan.swapInfo?.ammKey,
        label: plan.label || plan.swapInfo?.label,
        inputMint: plan.inputMint || plan.swapInfo?.inputMint,
        outputMint: plan.outputMint || plan.swapInfo?.outputMint,
        inAmount: plan.inAmount || plan.swapInfo?.inAmount,
        outAmount: plan.outAmount || plan.swapInfo?.outAmount,
        percent: plan.percent
      })) || []
    },
    transaction: orderData.transaction,
    requestId: orderData.requestId,
    router: orderData.router,
    swapType: orderData.swapType,
    fees: {
      signatureFeeLamports: orderData.signatureFeeLamports || 0,
      prioritizationFeeLamports: orderData.prioritizationFeeLamports || 0,
      rentFeeLamports: orderData.rentFeeLamports || 0,
      feeBps: orderData.feeBps,
      platformFee: orderData.platformFee
    }
  };
}
