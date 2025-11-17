import { address, getProgramDerivedAddress, getAddressEncoder } from '@solana/addresses';
import { validateContextOrigin } from '../../../shared/origin.js';
import { getToken } from '../shared/tokens.js';

const TOKEN_PROGRAM_ID = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

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
