/**
 * Wallet Context Preparation
 *
 * Prepares context needed for building wallet transactions.
 * For SPL tokens, this includes fetching/deriving token accounts.
 */

import { address, getProgramDerivedAddress, getAddressEncoder } from '@solana/addresses';
import { validateContextOrigin } from '../../../shared/origin.js';
import { getToken } from '../shared/tokens.js';

// Token Program for deriving Associated Token Addresses
const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Derive Associated Token Address
 */
async function getAssociatedTokenAddress(mint, owner) {
  const encoder = getAddressEncoder();
  const seeds = [
    encoder.encode(owner),
    encoder.encode(TOKEN_PROGRAM_ID),
    encoder.encode(mint)
  ];

  const [ata] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
    seeds
  });

  return ata;
}

/**
 * Prepare transfer context
 *
 * @param {Object} config
 * @param {Object} config.rpc - Solana RPC client
 * @param {Object} config.context - Context object with wallet and origin
 * @param {Object} config.params - Transfer params (recipient, amount, etc.)
 * @returns {Promise<Object>} Context with lifetime and token accounts
 */
export async function prepareTransferContext({ rpc, context, params }) {
  // Validate origin
  const originValidation = validateContextOrigin(context, 'Wallet Transfer Context');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Wallet] ${originValidation.warning}`);
  }

  const { recipient, mint: mintAddress, symbol } = params;

  // Get latest blockhash for transaction lifetime
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const lifetime = {
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
  };

  // If transferring SPL tokens, derive token accounts
  let senderTokenAccount;
  let recipientTokenAccount;

  if (mintAddress || symbol) {
    let mint;

    if (symbol) {
      const token = getToken(symbol);
      if (token.isNative) {
        // SOL transfer - no token accounts needed
        return { lifetime };
      }
      mint = token.mint;
    } else {
      mint = address(mintAddress);
    }

    // Derive associated token addresses
    const owner = address(context.wallet);
    const recipientAddr = address(recipient);

    senderTokenAccount = await getAssociatedTokenAddress(mint, owner);
    recipientTokenAccount = await getAssociatedTokenAddress(mint, recipientAddr);

    return {
      lifetime,
      senderTokenAccount: String(senderTokenAccount),
      recipientTokenAccount: String(recipientTokenAccount)
    };
  }

  // SOL transfer - only need lifetime
  return { lifetime };
}
