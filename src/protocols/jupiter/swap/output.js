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
 * @param {object} enclaveResponse - Response from enclave (includes transaction, attestation, data, metadata)
 * @returns {object} Transformed output with success field
 */
export function transformSwapOutput(enclaveResponse) {
  // Add success field to enclave response
  return {
    success: true,
    ...enclaveResponse
  };
}
