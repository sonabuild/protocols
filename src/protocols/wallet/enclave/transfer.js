/**
 * Wallet Transfer Transaction Builder - Enclave-safe, no network calls
 *
 * Builds transactions for transferring SOL or SPL tokens to another wallet.
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
import { getToken, TOKENS } from '../shared/tokens.js';
import { safeAmountToRaw } from '../../../shared/amounts.js';

const SYSTEM_PROGRAM_ID = address('11111111111111111111111111111111');
const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const MEMO_PROGRAM_ID = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Build SOL transfer instruction
 */
function buildSolTransferInstruction(from, to, lamports) {
  // System Program Transfer instruction
  // Instruction discriminator: 2 (u32)
  // Amount: lamports (u64)
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true); // Transfer instruction
  view.setBigUint64(4, BigInt(lamports), true); // Amount

  return {
    programAddress: SYSTEM_PROGRAM_ID,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE }
    ],
    data
  };
}

/**
 * Build SPL token transfer instruction
 */
function buildTokenTransferInstruction(from, to, owner, amount) {
  // Token Program Transfer instruction
  // Instruction discriminator: 3 (u8)
  // Amount: amount (u64)
  const data = new Uint8Array(9);
  data[0] = 3; // Transfer instruction
  const view = new DataView(data.buffer);
  view.setBigUint64(1, BigInt(amount), true); // Amount

  return {
    programAddress: TOKEN_PROGRAM_ID,
    accounts: [
      { address: from, role: AccountRole.WRITABLE }, // Source token account
      { address: to, role: AccountRole.WRITABLE },   // Destination token account
      { address: owner, role: AccountRole.READONLY_SIGNER } // Owner
    ],
    data
  };
}

/**
 * Build memo instruction
 */
function buildMemoInstruction(memo) {
  const encoder = new TextEncoder();
  const data = encoder.encode(memo);

  return {
    programAddress: MEMO_PROGRAM_ID,
    accounts: [],
    data
  };
}

/**
 * Build transfer transaction
 *
 * @param {Object} params - Transfer parameters from schema
 * @param {string} params.recipient - Recipient wallet address
 * @param {number} params.amount - Amount in token units (not lamports)
 * @param {string} [params.mint] - Token mint address (omit for SOL)
 * @param {string} [params.symbol] - Token symbol (alternative to mint)
 * @param {string} [params.memo] - Optional transfer memo
 * @param {Object} context - User context {wallet, origin}
 * @param {string} context.wallet - Sender wallet address
 * @param {Object} prepared - Context from preparation
 * @param {Object} prepared.lifetime - Blockhash and lastValidBlockHeight
 * @param {string} [prepared.senderTokenAccount] - Sender's token account (for SPL)
 * @param {string} [prepared.recipientTokenAccount] - Recipient's token account (for SPL)
 */
export function buildTransferTransaction(params, context, prepared) {
  const userPubkey = address(context.wallet);
  const recipient = address(params.recipient);
  const { lifetime, senderTokenAccount, recipientTokenAccount } = prepared;

  let token;
  let amountRaw;
  let symbol;

  if (params.mint || params.symbol) {
    if (params.symbol) {
      token = getToken(params.symbol);
      symbol = token.symbol;
    } else {
      const foundToken = Object.values(TOKENS).find(t =>
        t.mint && String(t.mint) === params.mint
      );
      if (!foundToken) {
        throw new Error(`Unknown token mint: ${params.mint}`);
      }
      token = foundToken;
      symbol = token.symbol;
    }

    try {
      amountRaw = safeAmountToRaw(params.amount, token.decimals, symbol);
    } catch (error) {
      throw new Error(`Amount conversion failed for ${symbol}: ${error.message}`);
    }

    if (!senderTokenAccount || !recipientTokenAccount) {
      throw new Error('Token accounts must be provided for SPL token transfers');
    }
  } else {
    symbol = 'SOL';

    try {
      amountRaw = safeAmountToRaw(params.amount, 9, 'SOL'); // SOL has 9 decimals
    } catch (error) {
      throw new Error(`Amount conversion failed for SOL: ${error.message}`);
    }
  }

  let txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(userPubkey, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx)
  );

  if (params.mint || params.symbol) {
    const transferInstruction = buildTokenTransferInstruction(
      address(senderTokenAccount),
      address(recipientTokenAccount),
      userPubkey,
      amountRaw
    );
    txMessage = appendTransactionMessageInstruction(transferInstruction, txMessage);
  } else {
    const transferInstruction = buildSolTransferInstruction(
      userPubkey,
      recipient,
      amountRaw
    );
    txMessage = appendTransactionMessageInstruction(transferInstruction, txMessage);
  }

  if (params.memo) {
    const memoInstruction = buildMemoInstruction(params.memo);
    txMessage = appendTransactionMessageInstruction(memoInstruction, txMessage);
  }

  const transaction = compileTransaction(txMessage);
  const wireTransaction = getBase64EncodedWireTransaction(transaction);
  validateBuiltTransaction(wireTransaction, 'Wallet Transfer', txMessage);

  return {
    wireTransaction,
    transfer: {
      from: String(userPubkey),
      to: String(recipient),
      amount: params.amount.toString(),
      mint: params.mint,
      symbol,
      memo: params.memo
    }
  };
}
