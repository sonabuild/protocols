import { prepareSolendDepositContext } from '../context/index.js';

export async function prepareDepositInput(input, rpc) {
  const { context, params } = input;
  return await prepareSolendDepositContext({ rpc, context, params });
}
