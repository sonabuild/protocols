/**
 * Solend Deposit - Transaction Builder (build stage)
 *
 * PURE FUNCTION - NO SIDE EFFECTS
 * - No network access
 * - No file system access
 * - Builds transactions for depositing USDC to Solend
 *
 * This runs inside the AWS Nitro Enclave with attestation.
 */

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
 * Build Solend deposit transaction (build stage)
 *
 * Constructs an atomic transaction that deposits USDC into Solend's main pool,
 * mints cUSDC collateral tokens, and deposits them into the user's obligation account.
 *
 * @param {object} decryptedPayload - Verified secrets from encrypted payload
 * @param {object} decryptedPayload.context - User context {wallet, origin}
 * @param {object} decryptedPayload.params - Deposit params {amount}
 * @param {object} prepared - Pre-fetched data from prep stage
 * @param {boolean} includeAttestation - Whether to include attestation
 * @returns {object} { wireTransaction, deposit: {...} }
 */
export function buildDepositTransaction(decryptedPayload, prepared, includeAttestation) {
  const { context, params } = decryptedPayload;
  const { lifetime, userUsdcAta, userCusdcAta, obligationAccount } = prepared;

  const userAddress = address(context.wallet);

  // Convert amount to lamports (USDC has 6 decimals)
  const amountLamports = Math.floor(params.amount * 1_000_000);

  // Build instruction data: [instruction_type: u8, amount: u64 little-endian]
  const data = new Uint8Array(9);
  data[0] = INSTRUCTION.DEPOSIT_RESERVE_LIQUIDITY_AND_OBLIGATION_COLLATERAL;
  const view = new DataView(data.buffer);
  view.setBigUint64(1, BigInt(amountLamports), true);

  // Build Solend deposit instruction
  const depositInstruction = {
    programAddress: SOLEND_PROGRAM_ID,
    accounts: [
      { address: address(userUsdcAta), role: AccountRole.WRITABLE }, // User USDC
      { address: address(userCusdcAta), role: AccountRole.WRITABLE }, // User cUSDC
      { address: USDC_RESERVE, role: AccountRole.WRITABLE }, // USDC Reserve
      { address: USDC_LIQUIDITY_SUPPLY, role: AccountRole.WRITABLE }, // Liquidity Supply
      { address: CUSDC_MINT, role: AccountRole.WRITABLE }, // cUSDC Mint
      { address: MAIN_POOL_MARKET, role: AccountRole.WRITABLE }, // Lending Market
      { address: LENDING_MARKET_AUTHORITY, role: AccountRole.READONLY }, // Market Authority
      { address: CUSDC_SUPPLY, role: AccountRole.WRITABLE }, // Collateral Vault
      { address: address(obligationAccount), role: AccountRole.WRITABLE }, // Obligation
      { address: userAddress, role: AccountRole.READONLY_SIGNER }, // Signer
      { address: SOLEND_ACCOUNT_1, role: AccountRole.READONLY },
      { address: SOLEND_ACCOUNT_2, role: AccountRole.READONLY },
      { address: userAddress, role: AccountRole.READONLY_SIGNER }, // Signer (dup)
      { address: TOKEN_PROGRAM_ID, role: AccountRole.READONLY } // Token Program
    ],
    data
  };

  // Build transaction message
  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(userAddress, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
    (tx) => appendTransactionMessageInstruction(depositInstruction, tx)
  );

  // Compile and validate
  const transaction = compileTransaction(txMessage);
  const wireTransaction = getBase64EncodedWireTransaction(transaction);
  validateBuiltTransaction(wireTransaction, 'Solend Deposit', txMessage);

  return {
    wireTransaction,
    deposit: {
      amount: params.amount.toString(),
      amountRaw: amountLamports.toString(),
      tokenSymbol: 'USDC',
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      account: String(obligationAccount)
    }
  };
}
