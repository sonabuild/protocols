export function transformSwapOutput(enclaveResponse) {
  return {
    success: true,
    ...enclaveResponse
  };
}
