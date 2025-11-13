// Token registry with metadata for supported tokens

import { address } from '@solana/addresses';

export const TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    mint: null, // Native SOL doesn't have a mint
    isNative: true
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    isNative: false
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    mint: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
    isNative: false
  },
  BONK: {
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    mint: address('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
    isNative: false
  }
};

export function getToken(symbol) {
  const token = TOKENS[symbol.toUpperCase()];
  if (!token) {
    throw new Error(`Unknown token: ${symbol}`);
  }
  return token;
}

export function getSupportedTokens() {
  return Object.keys(TOKENS);
}
