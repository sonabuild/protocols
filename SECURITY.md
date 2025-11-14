# Security Policy

## About This Repository

This repository contains **reference implementations** of Solana transaction builders used by Sona. We open-source this code for **transparency** - to show exactly how we construct transactions in our secure enclave environment.

**This is not intended as a production-ready library for third-party integration.** The code is shared so that:
- Users can verify what transactions we're building on their behalf
- Security researchers can audit our transaction construction logic
- The Solana community can learn from our implementation patterns

## Reporting a Vulnerability

If you discover a security vulnerability in these transaction builders, please report it responsibly:

**Email**: [security@sona.build](mailto:security@sona.build)

**Please do not report security vulnerabilities through public GitHub issues.**

Include in your report:
- Type of vulnerability and potential impact
- Location of the affected code (file path and line numbers)
- Step-by-step reproduction instructions
- Proof-of-concept (if applicable)

We will acknowledge your report within 48 hours and work with you on disclosure timing.

## How Our Security Works

### Enclave Architecture

We run transaction builders in AWS Nitro Enclaves for security isolation:

**Network Isolation**
- Transaction builders (`src/protocols/*/enclave/`) contain zero network code
- All RPC data is fetched on the host side (`src/protocols/*/context/`)
- The enclave bundle (`dist/enclave.bundle.js`) excludes all RPC dependencies
- This prevents the enclave from leaking user keys or transaction data

**Two-Phase Design**
```
1. Host (network access)    →  Fetch blockhash, account data, quotes
2. Enclave (isolated)        →  Build transaction with pre-fetched data
```

### Transaction Security

**Origin Validation** (`src/shared/origin.js`)
- Every transaction is tagged with an origin (e.g., `https://sona.build`)
- Origins are validated against an allowlist
- Prevents unauthorized transaction construction

**Input Validation**
- All parameters validated with Zod schemas before transaction building
- Amount ranges enforced (min/max bounds)
- Solana addresses validated (base58 format)
- Token symbols checked against allowlist
- Slippage bounds verified

**Transaction Limits**
- Size validated against Solana's 1232 byte limit
- Instruction count monitored
- Warnings issued when approaching limits

**Signature Requirements**
- All transactions require user approval and signature
- We never have access to private keys
- Transactions are returned unsigned to the user's wallet

### Dependencies

We minimize dependencies and use only official, audited packages:
- **@solana/\*** - Official Solana Web3.js v2 libraries
- **zod** - Runtime type validation (optional, only for schemas)

## Code Review & Verification

### What You Can Verify

This repository allows you to verify:

1. **Transaction Construction** - See exactly how we build Solend deposits, Jupiter swaps, and wallet transfers
2. **No Hidden Instructions** - All transaction instructions are explicitly defined in `src/protocols/*/enclave/`
3. **Input Handling** - Review how user inputs (amounts, addresses) are validated
4. **Network Isolation** - Confirm enclave builders make zero network calls
5. **Dependencies** - All dependencies are declared in `package.json`

### How to Review

```bash
# Clone and examine the code
git clone https://github.com/sonabuild/protocols.git
cd protocols

# Install dependencies
bun install

# Run tests to see transaction construction in action
bun test

# Build the enclave bundle and verify its contents
bun run build
node -e "import('./dist/enclave.bundle.js').then(console.log)"

# Check for network code (should return 0)
grep -r "fetch\|XMLHttpRequest" src/protocols/*/enclave/ || echo "✓ No network code"
```

### Known Limitations

These are technical constraints of our implementation:

1. **Jupiter API Dependency** - Swap quotes require the Jupiter API (host-side only)
2. **RPC Requirements** - Context preparation needs Solana RPC access
3. **Protocol Updates** - Solana program changes may require code updates
4. **Limited Protocols** - Currently supports Solend, Jupiter, and basic wallet operations

### Audit Status

This codebase has not undergone an independent security audit. We welcome community review and will address any issues found.

## Safe Harbor for Security Researchers

We encourage security research on this codebase and support safe harbor for researchers who:

- Make a good faith effort to avoid disruption and privacy violations
- Only test with accounts you own or have explicit permission to use
- Do not exploit vulnerabilities beyond proof-of-concept
- Report findings privately before public disclosure
- Allow reasonable time for us to address issues

Thank you for helping us build transparently and securely.
