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
import { getToken, TOKENS } from '../shared/tokens.js';
import { safeAmountToRaw } from '../../../shared/enclave/amounts.js';

const SYSTEM_PROGRAM_ID = address('11111111111111111111111111111111');
const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const MEMO_PROGRAM_ID = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Builds a native SOL transfer instruction.
 * @param {Address} from - Sender address
 * @param {Address} to - Recipient address
 * @param {number} lamports - Amount in lamports
 * @returns {Object} System program transfer instruction
 */
function buildSolTransferInstruction(from, to, lamports) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigUint64(4, BigInt(lamports), true);

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
 * Builds an SPL token transfer instruction.
 * @param {Address} from - Source token account
 * @param {Address} to - Destination token account
 * @param {Address} owner - Token account owner (signer)
 * @param {number} amount - Amount in token base units
 * @returns {Object} Token program transfer instruction
 */
function buildTokenTransferInstruction(from, to, owner, amount) {
  const data = new Uint8Array(9);
  data[0] = 3;
  const view = new DataView(data.buffer);
  view.setBigUint64(1, BigInt(amount), true);

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
 * Builds a memo instruction.
 * @param {string} memo - Memo text
 * @returns {Object} Memo program instruction
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
 * Builds a wallet transfer transaction in the enclave.
 * Pure function with no side effects - runs in attested environment.
 * @param {Object} decryptedPayload - Decrypted user request
 * @param {Object} decryptedPayload.context - User context (wallet, origin)
 * @param {Object} decryptedPayload.params - Transfer params (recipient, amount, mint?, symbol?, memo?)
 * @param {Object} prepared - Pre-fetched data from prep stage
 * @param {boolean} includeAttestation - Whether attestation is requested
 * @returns {Object} Transaction data { wireTransaction, transfer }
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

    if (!token.isNative && (!senderTokenAccount || !recipientTokenAccount)) {
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

  if (token && !token.isNative) {
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
      ...(params.mint ? { mint: params.mint } : {}),
      symbol
    }
  };
}
