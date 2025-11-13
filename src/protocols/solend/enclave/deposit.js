// Solend deposit transaction builder - enclave-safe, no network calls

import { address } from '@solana/addresses';
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction
} from '@solana/transaction-messages';
import { pipe } from '@solana/functional';
import { AccountRole } from '@solana/instructions';
import { compileTransaction, getBase64EncodedWireTransaction } from '@solana/transactions';
import { validateBuiltTransaction } from '../../../shared/builders.js';

import {
  SOLEND_PROGRAM_ID,
  MAIN_POOL_MARKET,
  LENDING_MARKET_AUTHORITY,
  USDC_RESERVE,
  USDC_LIQUIDITY_SUPPLY,
  CUSDC_MINT,
  CUSDC_SUPPLY,
  TOKEN_PROGRAM_ID,
  SOLEND_ACCOUNT_1,
  SOLEND_ACCOUNT_2,
  INSTRUCTION
} from '../shared/constants.js';

/**
 * Build a Solend deposit transaction (USDC → cUSDC collateral)
 *
 * Constructs an atomic transaction that deposits USDC into Solend's main pool,
 * mints cUSDC collateral tokens, and deposits them into the user's obligation account.
 *
 * @param {Object} params - Operation parameters
 * @param {number} params.amount - USDC amount in lamports (6 decimals, e.g., 1_000_000 = 1 USDC)
 * @param {Object} context - User context
 * @param {string} context.wallet - User's wallet address
 * @param {Object} prepared - Pre-fetched context from prepareContext()
 * @param {Object} prepared.lifetime - Blockhash and last valid block height
 * @param {string} prepared.userUsdcAta - User's USDC associated token account
 * @param {string} prepared.userCusdcAta - User's cUSDC associated token account
 * @param {string} prepared.obligationAccount - User's Solend obligation account
 * @returns {Object} Transaction result
 * @returns {string} result.wireTransaction - Base64-encoded transaction
 * @returns {Object} result.deposit - Deposit metadata (amount, token, account)
 */
export function buildDepositTransaction(params, context, prepared) {
  const { amount } = params;
  const { wallet } = context;
  const { lifetime, userUsdcAta, userCusdcAta, obligationAccount } = prepared;
  const userAddress = address(wallet);

  const data = new Uint8Array(9);
  data[0] = INSTRUCTION.DEPOSIT_RESERVE_LIQUIDITY_AND_OBLIGATION_COLLATERAL;
  const view = new DataView(data.buffer);
  view.setBigUint64(1, BigInt(amount), true);

  const depositInstruction = {
    programAddress: SOLEND_PROGRAM_ID,
    accounts: [
      { address: userUsdcAta, role: AccountRole.WRITABLE }, // User USDC
      { address: userCusdcAta, role: AccountRole.WRITABLE }, // User cUSDC
      { address: USDC_RESERVE, role: AccountRole.WRITABLE }, // USDC Reserve
      { address: USDC_LIQUIDITY_SUPPLY, role: AccountRole.WRITABLE }, // Liquidity Supply
      { address: CUSDC_MINT, role: AccountRole.WRITABLE }, // cUSDC Mint
      { address: MAIN_POOL_MARKET, role: AccountRole.WRITABLE }, // Lending Market
      { address: LENDING_MARKET_AUTHORITY, role: AccountRole.READONLY }, // Market Authority
      { address: CUSDC_SUPPLY, role: AccountRole.WRITABLE }, // Collateral Vault
      { address: obligationAccount, role: AccountRole.WRITABLE }, // Obligation
      { address: userAddress, role: AccountRole.READONLY_SIGNER }, // Signer
      { address: SOLEND_ACCOUNT_1, role: AccountRole.READONLY },
      { address: SOLEND_ACCOUNT_2, role: AccountRole.READONLY },
      { address: userAddress, role: AccountRole.READONLY_SIGNER }, // Signer (dup)
      { address: TOKEN_PROGRAM_ID, role: AccountRole.READONLY } // Token Program
    ],
    data
  };

  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(userAddress, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
    (tx) => appendTransactionMessageInstruction(depositInstruction, tx)
  );

  const transaction = compileTransaction(txMessage);
  const wireTransaction = getBase64EncodedWireTransaction(transaction);
  validateBuiltTransaction(wireTransaction, 'Solend Deposit', txMessage);

  return {
    wireTransaction,
    message: txMessage,
    deposit: {
      amount: (amount / 1_000_000).toString(),
      amountRaw: amount.toString(),
      tokenSymbol: 'USDC',
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      account: String(obligationAccount)
    }
  };
}
