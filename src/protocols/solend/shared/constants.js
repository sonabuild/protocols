/**
 * Solend protocol constants
 */
import { address } from '@solana/addresses';

export const USDC_MINT = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const CUSDC_MINT = address('993dVFL2uXWYeoXuEBFXR4BijeXdTv4s6BzsCjJZuwqk');

export const SOLEND_PROGRAM_ID = address('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo');
export const MAIN_POOL_MARKET = address('4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY');
export const LENDING_MARKET_AUTHORITY = address('DdZR6zRFiUt4S5mg7AV1uKB2z1f1WzcNYCaTEEWPAuby');

export const USDC_RESERVE = address('BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw');
export const USDC_LIQUIDITY_SUPPLY = address('8SheGtsopRUDzdiD6v6BR9a6bqZ9QwywYQY99Fp5meNf');
export const CUSDC_SUPPLY = address('UtRy8gcEu9fCkDuUrU8EmC7Uc6FZy5NCwttzG7i6nkw');

export const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const SYSTEM_PROGRAM_ID = address('11111111111111111111111111111111');
export const RENT_SYSVAR = address('SysvarRent111111111111111111111111111111111');

// Additional Solend accounts (from reference transaction analysis)
export const SOLEND_ACCOUNT_1 = address('Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD');
export const SOLEND_ACCOUNT_2 = address('CZx29wKMUxaJDq6aLVQTdViPL754tTR64NAgQBUGxxHb');

export const INSTRUCTION = {
  // Based on Solend program source code: https://github.com/solendprotocol/solana-program-library
  INIT_OBLIGATION: 7,
  WITHDRAW_OBLIGATION_COLLATERAL: 9,  // Single operation - just removes collateral
  DEPOSIT_OBLIGATION_COLLATERAL: 10,
  DEPOSIT_RESERVE_LIQUIDITY_AND_OBLIGATION_COLLATERAL: 14,  // Combined atomic deposit
  WITHDRAW_OBLIGATION_COLLATERAL_AND_REDEEM_RESERVE_COLLATERAL: 15  // Combined atomic withdrawal
};
