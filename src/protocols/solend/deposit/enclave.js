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
import { validateBuiltTransaction } from '../../../shared/enclave/builders.js';
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
 * Builds a Solend deposit transaction in the enclave.
 * Pure function with no side effects - runs in attested environment.
 * @param {Object} decryptedPayload - Decrypted user request
 * @param {Object} decryptedPayload.context - User context (wallet, origin)
 * @param {Object} decryptedPayload.params - Deposit params (amount)
 * @param {Object} prepared - Pre-fetched data from prep stage
 * @param {boolean} includeAttestation - Whether attestation is requested
 * @returns {Object} Transaction data { wireTransaction, deposit }
 */
export function buildDepositTransaction(decryptedPayload, prepared, includeAttestation) {
  const { context, params } = decryptedPayload;
  const { lifetime, userUsdcAta, userCusdcAta, obligationAccount } = prepared;

  const userAddress = address(context.wallet);

  const amountLamports = Math.floor(params.amount * 1_000_000);

  const data = new Uint8Array(9);
  data[0] = INSTRUCTION.DEPOSIT_RESERVE_LIQUIDITY_AND_OBLIGATION_COLLATERAL;
  const view = new DataView(data.buffer);
  view.setBigUint64(1, BigInt(amountLamports), true);

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
      { address: userAddress, role: AccountRole.READONLY_SIGNER },
      { address: TOKEN_PROGRAM_ID, role: AccountRole.READONLY }
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
    deposit: {
      amount: params.amount.toString(),
      amountRaw: amountLamports.toString(),
      tokenSymbol: 'USDC',
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      account: String(obligationAccount)
    }
  };
}
