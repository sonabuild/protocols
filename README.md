# @sonabuild/protocols

[![codecov](https://codecov.io/github/sonabuild/protocols/graph/badge.svg?token=FR2020LNJE)](https://codecov.io/github/sonabuild/protocols)

Open-source protocol definitions for building attested Solana transactions.

## Overview

This package provides **reference implementations** for building Solana protocol transactions in a secure, attested environment. We open-source this code for **transparency** - to show exactly how Sona constructs transactions in AWS Nitro Enclaves.

Each protocol separates host-side context preparation (network access) from enclave-side transaction building (network-isolated, cryptographically attested).

## Features

- **Schema-driven**: Type-safe protocol definitions using Zod validation
- **Enclave-compatible**: Network-isolated transaction builders for AWS Nitro Enclaves
- **Standardized API**: All protocols export identical function signatures
- **Zero protocol SDKs**: Built using only `@solana/web3.js` v2 primitives

## Supported Protocols

- **Solend** - USDC lending protocol (deposit, withdraw, positions query)
- **Jupiter** - Token swaps via Jupiter aggregator
- **Wallet** - Native SOL and SPL token transfers, balance queries

## Installation

```bash
npm install @sonabuild/protocols
# or
bun add @sonabuild/protocols
```

## Usage

### Standard Protocol API

All protocols export the same standardized interface:

```javascript
import { createSolanaRpc } from '@solana/rpc';
import * as solend from '@sonabuild/protocols/solend';
import * as jupiter from '@sonabuild/protocols/jupiter';
import * as wallet from '@sonabuild/protocols/wallet';

const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');

// Each protocol exports:
// - prepareContext(operation, config)  // Host-side context preparation
// - executeQuery(query, config)        // Read-only queries
// - schema                             // Protocol schema object
// - operations                         // Array of operation names
// - queries                            // Array of query names
```

### Example: Solend Deposit

```javascript
import { createSolanaRpc } from '@solana/rpc';
import * as solend from '@sonabuild/protocols/solend';

const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');

// 1. Prepare context (host-side, requires network)
const prepared = await solend.prepareContext('deposit', {
  rpc,
  context: {
    wallet: 'USER_PUBLIC_KEY',
    origin: 'https://your-app.com'
  },
  params: {
    amount: 100_000_000  // 100 USDC (6 decimals)
  }
});

// 2. Build transaction (enclave-side, no network)
// In production, this happens inside AWS Nitro Enclave:
import { buildProtocolTransaction } from '@sonabuild/protocols/enclave';

const result = await buildProtocolTransaction({
  protocol: 'solend',
  context: { wallet: 'USER_PUBLIC_KEY', origin: 'https://your-app.com' },
  params: { operation: 'deposit', amount: 100_000_000 },
  prepared
});

// Result contains:
// - wireTransaction: base64-encoded transaction
// - deposit: { amount, amountRaw, tokenSymbol, tokenMint, account }
```

### Example: Jupiter Swap

```javascript
import * as jupiter from '@sonabuild/protocols/jupiter';

const prepared = await jupiter.prepareContext('swap', {
  rpc,
  context: { wallet: 'USER_PUBLIC_KEY', origin: 'https://your-app.com' },
  params: {
    inputMint: 'So11111111111111111111111111111111111111112',  // SOL
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    amount: 1.0,
    slippageBps: 50  // 0.5% slippage
  }
});

// Enclave builds transaction from prepared Jupiter quote
const result = await buildProtocolTransaction({
  protocol: 'jupiter',
  context: { wallet: 'USER_PUBLIC_KEY', origin: 'https://your-app.com' },
  params: { operation: 'swap', inputMint, outputMint, amount, slippageBps },
  prepared
});
```

### Example: Wallet Transfer

```javascript
import * as wallet from '@sonabuild/protocols/wallet';

const prepared = await wallet.prepareContext('transfer', {
  rpc,
  context: { wallet: 'USER_PUBLIC_KEY', origin: 'https://your-app.com' },
  params: {
    recipient: 'RECIPIENT_PUBLIC_KEY',
    amount: 1_500_000,  // 1.5 USDC (6 decimals)
    symbol: 'USDC'
  }
});

const result = await buildProtocolTransaction({
  protocol: 'wallet',
  context: { wallet: 'USER_PUBLIC_KEY', origin: 'https://your-app.com' },
  params: { operation: 'transfer', recipient, amount, symbol },
  prepared
});
```

### Query Operations

Queries are read-only operations that don't require enclave attestation:

```javascript
import * as wallet from '@sonabuild/protocols/wallet';
import * as solend from '@sonabuild/protocols/solend';

// Get wallet token balance
const balance = await wallet.executeQuery('balance', {
  rpc,
  context: { wallet: 'USER_PUBLIC_KEY', origin: 'https://your-app.com' },
  params: { symbols: ['SOL', 'USDC'] }
});

// Get Solend lending positions
const position = await solend.executeQuery('positions', {
  rpc,
  context: { wallet: 'USER_PUBLIC_KEY', origin: 'https://your-app.com' },
  params: {}
});
```

### Available Operations and Queries

```javascript
import * as solend from '@sonabuild/protocols/solend';
import * as jupiter from '@sonabuild/protocols/jupiter';
import * as wallet from '@sonabuild/protocols/wallet';

console.log(solend.operations);   // ['deposit', 'withdraw']
console.log(solend.queries);      // ['positions']

console.log(jupiter.operations);  // ['swap']
console.log(jupiter.queries);     // []

console.log(wallet.operations);   // ['transfer']
console.log(wallet.queries);      // ['balance']
```

## Architecture

### Two-Phase Execution Model

```
┌─────────────────────────────────────────────────────────────┐
│                   HOST (Network Access)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  prepareContext(operation, config)                   │  │
│  │  - Fetches blockhash from Solana RPC                 │  │
│  │  - Queries account data and derives addresses        │  │
│  │  - Calls external APIs (Jupiter)                     │  │
│  │  - Returns serializable context object               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ (Pass pre-fetched data)
┌─────────────────────────────────────────────────────────────┐
│               ENCLAVE (Network-Isolated)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  buildProtocolTransaction({ protocol, params, ... }) │  │
│  │  - Builds transactions using pre-fetched context     │  │
│  │  - NO network access required                        │  │
│  │  - Deterministic and reproducible                    │  │
│  │  - Cryptographically attested                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Bundle Structure

This package ships **minified bundles** to avoid exposing source code:

- `@sonabuild/protocols/enclave` (43 KB) - Transaction builders only, no RPC
- `@sonabuild/protocols/solend` (121 KB) - Full Solend protocol with RPC
- `@sonabuild/protocols/jupiter` (120 KB) - Full Jupiter protocol with RPC
- `@sonabuild/protocols/wallet` (118 KB) - Full wallet protocol with RPC

**Source code is NOT shipped** - only compiled, minified bundles in `dist/`.

## Protocol Schema System

Each protocol includes a schema object for validation and documentation:

```javascript
import * as solend from '@sonabuild/protocols/solend';

// Schema includes all operation and query definitions
const schema = solend.schema;

// Validate user params before calling prepareContext
const result = schema.operations.deposit.validateParams({ amount: 100_000_000 });
if (!result.success) {
  console.error('Invalid params:', result.error);
}

// Generate JSON Schema for API documentation
const jsonSchema = schema.operations.deposit.toJSONSchema();

// Generate LLM tool definitions (OpenAI function calling format)
const toolDefinition = schema.operations.deposit.toToolDefinition();
```

## Testing

```bash
# Run all tests
bun test

# Run specific protocol tests
bun test src/protocols/solend
bun test src/protocols/jupiter
bun test src/protocols/wallet

# Run with coverage
bun test --coverage
```

**Test Suite**: 21 test files, 343 tests, ~8,600 lines of test code

## Directory Structure

```
src/
├── enclave.js                   # Enclave entry point (builders only)
├── protocols/
│   ├── solend/
│   │   ├── index.js             # Standardized API exports
│   │   ├── context/index.js     # Host-side RPC data fetching
│   │   ├── enclave/index.js     # Network-isolated builders
│   │   ├── query/index.js       # Read-only queries
│   │   ├── schema.js            # Protocol schema
│   │   └── shared/constants.js  # Protocol constants
│   ├── jupiter/
│   │   ├── index.js
│   │   ├── context/index.js
│   │   ├── enclave/index.js
│   │   └── schema.js
│   └── wallet/
│       ├── index.js
│       ├── context/index.js
│       ├── enclave/index.js
│       ├── query/index.js
│       ├── schema.js
│       └── shared/tokens.js
├── schema/
│   ├── types.js                 # OperationSchema, QuerySchema classes
│   └── registry.js              # Protocol registry (not exported)
└── shared/
    ├── schemas.js               # Solana Zod schemas
    ├── builders.js              # Transaction utilities
    ├── amounts.js               # Amount conversions
    └── origin.js                # Origin validation
```

## Security

### Origin Validation

All context preparation includes origin validation to prevent cross-origin attacks:

```javascript
const prepared = await solend.prepareContext('deposit', {
  rpc,
  context: {
    wallet: 'USER_PUBLIC_KEY',
    origin: 'https://your-app.com'  // Must match allowed origins
  },
  params: { amount: 100_000_000 }
});
```

Allowed origins (hardcoded in source):
- `https://sona.fi`
- `https://www.sona.fi`
- `https://app.sona.fi`
- `http://localhost:3000` (development only)

### Enclave Attestation

Transactions built in AWS Nitro Enclave are cryptographically signed with an enclave-specific key, proving:
1. Transaction was built in trusted enclave environment
2. No network access occurred during transaction building
3. Code matches expected hash (reproducible builds)

See [SECURITY.md](SECURITY.md) for details.

## Adding New Protocols

To add a new protocol to this repository:

1. **Create protocol directory**: `src/protocols/your-protocol/`
2. **Implement standardized API**:
   - `index.js` - Export `prepareContext`, `executeQuery`, `schema`, `operations`, `queries`
   - `context/index.js` - Implement context preparation (RPC access)
   - `enclave/index.js` - Implement transaction builders (no network)
   - `schema.js` - Define operations and queries
3. **Register in enclave**: Add builder to `src/enclave.js`
4. **Add build script**: Update `package.json` with build command
5. **Add export**: Update `package.json` exports field
6. **Write tests**: Follow `*.test.js` pattern

See existing protocols for reference implementation.

## Development Tools

### Transaction Analysis

Analyze real mainnet transactions to understand protocol operations:

```bash
SOLANA_RPC_URL="your-rpc-url" node tools/analyze-transaction.js <signature>
```

Outputs transaction structure, accounts, instructions, and implementation guidance.

**Note**: Requires `@solana/kit` in devDependencies.

## Documentation

- [TDD_WORKFLOW.md](docs/TDD_WORKFLOW.md) - Test-driven development workflow
- [SECURITY.md](SECURITY.md) - Security model and attestation

## License

Unlicensed

Built by [Asymmetric](https://github.com/asymmetric-dev) for [Sona](https://sona.build).

## Contributing

This repository is maintained by Sona for transparency purposes. The code is open-source to demonstrate how we build attested Solana transactions.

If you find issues or have suggestions, please open a GitHub issue.
