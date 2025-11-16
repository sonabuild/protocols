import { prepareSolendContext } from '../context/index.js';

export async function prepareDepositInput(input, rpc) {
  const { context, params } = input;
  return await prepareSolendContext({ rpc, context, params });
}
