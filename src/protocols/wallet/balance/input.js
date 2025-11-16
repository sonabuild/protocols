/**
 * Wallet Balance - Query Execution (prep stage)
 *
 * Executes balance query via Solana RPC
 *
 * IMPORTANT: This runs on the HOST with network access.
 */

import { address } from '@solana/addresses';
import { validateContextOrigin } from '../../../shared/origin.js';
import { getToken, getSupportedTokens } from '../shared/tokens.js';

/**
 * Internal helper - fetches balance for a single token
 */
async function _getTokenBalance(rpc, walletAddress, symbol) {
  const token = getToken(symbol);
  const owner = address(walletAddress);

  if (token.isNative) {
    // Get SOL balance
    const response = await rpc.getBalance(owner).send();
    const amountRaw = response.value.toString();
    const amount = (Number(amountRaw) / Math.pow(10, token.decimals)).toString();

    return {
      symbol: token.symbol,
      amount,
      amountRaw,
      decimals: token.decimals
    };
  }

  // Get SPL token balance
  const accounts = await rpc.getTokenAccountsByOwner(
    owner,
    { mint: token.mint },
    { encoding: 'jsonParsed' }
  ).send();

  if (accounts.value.length === 0) {
    // No token account exists
    return {
      symbol: token.symbol,
      mint: token.mint,
      amount: '0',
      amountRaw: '0',
      decimals: token.decimals
    };
  }

  const tokenAccount = accounts.value[0];
  const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;

  return {
    symbol: token.symbol,
    mint: token.mint,
    amount: tokenAmount.uiAmountString,
    amountRaw: tokenAmount.amount,
    decimals: tokenAmount.decimals
  };
}

/**
 * Prepare balance query (prep stage)
 *
 * @param {object} input - { context: { wallet, origin }, params: { symbols? } }
 * @param {object} rpc - Solana RPC client
 * @returns {Promise<object>} Balance data matching balanceOutputSchema
 */
export async function prepareBalanceInput(input, rpc) {
  const { context, params } = input;

  // Validate origin
  const originValidation = validateContextOrigin(context, 'Wallet Balance');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Wallet Balance] ${originValidation.warning}`);
  }

  const { symbols } = params;

  // Single token query
  if (symbols && symbols.length === 1) {
    return await _getTokenBalance(rpc, context.wallet, symbols[0]);
  }

  // Multiple tokens (or all tokens if symbols not provided)
  const tokensToQuery = symbols && symbols.length > 0 ? symbols : getSupportedTokens();
  const balances = {};

  await Promise.all(
    tokensToQuery.map(async (symbol) => {
      try {
        balances[symbol] = await _getTokenBalance(rpc, context.wallet, symbol);
      } catch (error) {
        console.error(`Failed to fetch ${symbol} balance:`, error.message);
      }
    })
  );

  return balances;
}
