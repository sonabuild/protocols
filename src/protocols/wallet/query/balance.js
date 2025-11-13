// Token balance queries via Solana RPC

import { address } from '@solana/addresses';
import { getToken, getSupportedTokens } from '../shared/tokens.js';

// Internal helper - takes positional args
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

// Public API - matches schema format
export async function getTokenBalance(rpc, { wallet, symbols }) {
  // Single token query
  if (symbols && symbols.length === 1) {
    return await _getTokenBalance(rpc, wallet, symbols[0]);
  }

  // Multiple tokens
  if (symbols && symbols.length > 1) {
    const balances = {};
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          balances[symbol] = await _getTokenBalance(rpc, wallet, symbol);
        } catch (error) {
          console.error(`Failed to fetch ${symbol} balance:`, error.message);
        }
      })
    );
    return balances;
  }

  // All tokens
  const allSymbols = getSupportedTokens();
  const balances = {};
  await Promise.all(
    allSymbols.map(async (symbol) => {
      try {
        balances[symbol] = await _getTokenBalance(rpc, wallet, symbol);
      } catch (error) {
        console.error(`Failed to fetch ${symbol} balance:`, error.message);
      }
    })
  );
  return balances;
}

export async function getMultipleTokenBalances(rpc, walletAddress, symbols) {
  return getTokenBalance(rpc, { wallet: walletAddress, symbols });
}

export async function getAllTokenBalances(rpc, walletAddress) {
  return getTokenBalance(rpc, { wallet: walletAddress });
}
