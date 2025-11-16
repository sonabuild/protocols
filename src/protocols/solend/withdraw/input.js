import { prepareSolendWithdrawContext } from '../context/index.js';

export async function prepareWithdrawInput(input, rpc) {
  const { context, params } = input;
  return await prepareSolendWithdrawContext({ rpc, context, params });
}
