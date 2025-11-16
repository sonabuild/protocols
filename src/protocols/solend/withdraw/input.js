import { prepareSolendContext } from '../context/index.js';

export async function prepareWithdrawInput(input, rpc) {
  const { context, params } = input;
  return await prepareSolendContext({ rpc, context, params });
}
