import { address, getProgramDerivedAddress, getAddressEncoder } from '@solana/addresses';
import { validateContextOrigin } from '../../../shared/origin.js';
import { getToken } from '../shared/tokens.js';

const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Derives the associated token account address for a given mint and owner.
 * @param {Address} mint - Token mint address
 * @param {Address} owner - Token account owner address
 * @returns {Promise<Address>} Associated token account address
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
 * Prepares wallet transfer by fetching blockhash and deriving token accounts.
 * Runs on host with network access before enclave execution.
 * @param {Object} input - Transfer request
 * @param {Object} input.context - User context (wallet, origin)
 * @param {Object} input.params - Transfer parameters (recipient, amount, mint?, symbol?, memo?)
 * @param {Object} rpc - Solana RPC client
 * @returns {Promise<Object>} Prepared data for enclave (lifetime, token accounts)
 */
export async function prepareTransferInput(input, rpc) {
  const { context, params } = input;

  const originValidation = validateContextOrigin(context, 'Wallet Transfer');
  if (!originValidation.valid) {
    throw new Error(originValidation.error);
  }
  if (originValidation.warning) {
    console.warn(`[Wallet] ${originValidation.warning}`);
  }

  const { recipient, mint: mintAddress, symbol } = params;

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const lifetime = {
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: BigInt(latestBlockhash.lastValidBlockHeight)
  };

  let senderTokenAccount;
  let recipientTokenAccount;

  if (mintAddress || symbol) {
    let mint;

    if (symbol) {
      const token = getToken(symbol);
      if (token.isNative) {
        return { lifetime };
      }
      mint = token.mint;
    } else {
      mint = address(mintAddress);
    }

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

  return { lifetime };
}
