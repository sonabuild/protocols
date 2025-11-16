/**
 * Wallet Transfer - Input Preparation (prep stage)
 *
 * Prepares context for wallet transfers:
 * - Fetches latest blockhash
 * - Derives token accounts (for SPL tokens)
 *
 * IMPORTANT: This runs on the HOST (not in enclave) with network access.
 */

import { address, getProgramDerivedAddress, getAddressEncoder } from '@solana/addresses';
import { validateContextOrigin } from '../../../shared/origin.js';
import { getToken } from '../shared/tokens.js';

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
 * Prepare transfer input (prep stage)
 *
 * @param {object} input - { context: { wallet, origin }, params: { recipient, amount, mint?, symbol?, memo? } }
 * @param {object} rpc - Solana RPC client
 * @returns {Promise<object>} Prepared data matching transferEnclaveSchema
 */
export async function prepareTransferInput(input, rpc) {
  const { context, params } = input;

  // Validate origin
  const originValidation = validateContextOrigin(context, 'Wallet Transfer');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Wallet] ${originValidation.warning}`);
  }

  const { recipient, mint: mintAddress, symbol } = params;

  // 1. Get latest blockhash
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const lifetime = {
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
  };

  // 2. If transferring SPL tokens, derive token accounts
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
