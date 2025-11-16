export function transformDepositOutput(enclaveResponse) {
  // Add success field to enclave response
  return {
    success: true,
    ...enclaveResponse
  };
}
