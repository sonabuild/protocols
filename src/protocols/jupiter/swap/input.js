/**
 * Jupiter Swap - Input Preparation (prep stage)
 * Pipeline V2 structure
 *
 * This runs on the HOST (not in enclave) with network access
 */
import { prepareJupiterSwapContext } from '../context/index.js';

/**
 * Prepare input for Jupiter swap
 * Fetches route from Jupiter API and prepares data for enclave
 *
 * @param {object} input - { context, params }
 * @param {object} input.context - User context { wallet, origin }
 * @param {object} input.params - Swap params { inputMint, outputMint, amount, slippageBps }
 * @param {object} rpc - Solana RPC client
 * @returns {Promise<object>} Prepared data matching swapEnclaveSchema
 */
export async function prepareSwapInput(input, rpc) {
  const { context, params } = input;

  // Use existing context preparation logic
  return await prepareJupiterSwapContext({
    rpc,
    context,
    params
  });
}
