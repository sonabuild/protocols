/**
 * Transforms enclave response by adding success field.
 * @param {Object} enclaveResponse - Response from enclave builder
 * @returns {Object} Transformed response with success flag
 */
export function transformSwapOutput(enclaveResponse) {
  return {
    success: true,
    ...enclaveResponse
  };
}
