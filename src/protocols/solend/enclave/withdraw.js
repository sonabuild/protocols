// Solend withdraw transaction builder - enclave-safe, no network calls

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
  INSTRUCTION
} from '../shared/constants.js';

// Withdraws cUSDC collateral → burns cUSDC → returns USDC (atomic)
export function buildWithdrawTransaction(params, context, prepared) {
  const { amount } = params;
  const { wallet } = context;
  const { lifetime, userUsdcAta, userCusdcAta, obligationAccount } = prepared;
  const userAddress = address(wallet);

  const data = new Uint8Array(9);
  data[0] = INSTRUCTION.WITHDRAW_OBLIGATION_COLLATERAL_AND_REDEEM_RESERVE_COLLATERAL;
  const view = new DataView(data.buffer);
  view.setBigUint64(1, BigInt(amount), true);

  const withdrawInstruction = {
    programAddress: SOLEND_PROGRAM_ID,
    accounts: [
      { address: CUSDC_SUPPLY, role: AccountRole.WRITABLE }, // Collateral Vault
      { address: userCusdcAta, role: AccountRole.WRITABLE }, // User cUSDC
      { address: USDC_RESERVE, role: AccountRole.WRITABLE }, // USDC Reserve
      { address: obligationAccount, role: AccountRole.WRITABLE }, // Obligation
      { address: MAIN_POOL_MARKET, role: AccountRole.WRITABLE }, // Lending Market
      { address: LENDING_MARKET_AUTHORITY, role: AccountRole.READONLY }, // Market Authority
      { address: userUsdcAta, role: AccountRole.WRITABLE }, // User USDC
      { address: CUSDC_MINT, role: AccountRole.WRITABLE }, // cUSDC Mint
      { address: USDC_LIQUIDITY_SUPPLY, role: AccountRole.WRITABLE }, // Liquidity Supply
      { address: userAddress, role: AccountRole.READONLY_SIGNER }, // Signer
      { address: userAddress, role: AccountRole.READONLY_SIGNER }, // Signer (dup)
      { address: TOKEN_PROGRAM_ID, role: AccountRole.READONLY }, // Token Program
      { address: USDC_RESERVE, role: AccountRole.READONLY } // USDC Reserve (dup)
    ],
    data
  };

  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(userAddress, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
    (tx) => appendTransactionMessageInstruction(withdrawInstruction, tx)
  );

  const transaction = compileTransaction(txMessage);
  const wireTransaction = getBase64EncodedWireTransaction(transaction);
  validateBuiltTransaction(wireTransaction, 'Solend Withdraw', txMessage);

  return {
    wireTransaction,
    message: txMessage,
    withdraw: {
      amount: (amount / 1_000_000).toString(),
      amountRaw: amount.toString(),
      tokenSymbol: 'USDC',
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      account: String(obligationAccount)
    }
  };
}
