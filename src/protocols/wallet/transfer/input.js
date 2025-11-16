import { prepareTransferContext } from '../context/index.js';

export async function prepareTransferInput(input, rpc) {
  const { context, params } = input;
  return await prepareTransferContext({ rpc, context, params });
}
