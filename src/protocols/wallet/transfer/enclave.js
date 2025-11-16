/**
 * Wallet Transfer - Transaction Builder (build stage)
 *
 * PURE FUNCTION - NO SIDE EFFECTS
 * - No network access
 * - No file system access
 * - Builds transactions for transferring SOL or SPL tokens
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
import { getToken, TOKENS } from '../shared/tokens.js';
import { safeAmountToRaw } from '../../../shared/amounts.js';

const SYSTEM_PROGRAM_ID = address('11111111111111111111111111111111');
const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const MEMO_PROGRAM_ID = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Build SOL transfer instruction
 */
function buildSolTransferInstruction(from, to, lamports) {
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
  const data = new Uint8Array(9);
  data[0] = 3; // Transfer instruction
  const view = new DataView(data.buffer);
  view.setBigUint64(1, BigInt(amount), true); // Amount

  return {
    programAddress: TOKEN_PROGRAM_ID,
    accounts: [
      { address: from, role: AccountRole.WRITABLE },
      { address: to, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY_SIGNER }
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
 * Build transfer transaction (build stage)
 *
 * @param {object} decryptedPayload - Verified secrets from encrypted payload
 * @param {object} decryptedPayload.context - User context {wallet, origin}
 * @param {object} decryptedPayload.params - Transfer params
 * @param {object} prepared - Pre-fetched data from prep stage
 * @param {boolean} includeAttestation - Whether to include attestation
 * @returns {object} { wireTransaction, transfer: {...} }
 */
export function buildTransferTransaction(decryptedPayload, prepared, includeAttestation) {
  const { context, params } = decryptedPayload;
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
      amountRaw = safeAmountToRaw(params.amount, 9, 'SOL');
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
      amount: amountRaw.toString(),
      mint: params.mint,
      symbol
    }
  };
}
