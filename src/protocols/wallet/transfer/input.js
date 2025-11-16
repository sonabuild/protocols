import { prepareWalletTransferContext } from '../context/index.js';

export async function prepareTransferInput(input, rpc) {
  const { context, params } = input;
  return await prepareWalletTransferContext({ rpc, context, params });
}
