export function transformWithdrawOutput(enclaveResponse) {
  // Add success field to enclave response
  return {
    success: true,
    ...enclaveResponse
  };
}
