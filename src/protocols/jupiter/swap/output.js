/**
 * Jupiter Swap - Output Transformation (post stage)
 * Pipeline V2 structure
 *
 * Optional transformation of builder output for API response
 */

/**
 * Transform swap builder output
 * For Jupiter swap, we don't need additional transformation
 *
 * @param {object} builderOutput - Output from buildSwapTransaction
 * @returns {object} Transformed output
 */
export function transformSwapOutput(builderOutput) {
  // No transformation needed - pass through
  return builderOutput;
}
