# TDD Workflow for Protocol Implementation

This document describes the test-driven development workflow for implementing protocol transaction builders in the Sona protocols package.

## Overview

When implementing a new protocol operation (deposit, withdrawal, etc.), we follow a TDD approach based on analyzing real mainnet transactions. This ensures our implementations exactly match what works on-chain.

## Workflow Steps

### 1. Find a Reference Transaction

First, find a working transaction on mainnet for the operation you want to implement.

**Example:**
```bash
# Find a Solend deposit transaction on Solscan.io or Solana Explorer
# Example signature: 31MUMU8oqwyiwct3M9jTnfMAxhXNfNRzRVB3BKRTk4PQQsES2Nyat6yMmBrJUWAKjL9iA26vJMsjHPJqroEYJ1Fc
```

### 2. Analyze the Transaction

Use the transaction analysis tool to understand the transaction structure:

```bash
cd packages/protocols
SOLANA_RPC_URL="your-rpc-url" node tools/analyze-transaction.js <signature>
```

**Example:**
```bash
SOLANA_RPC_URL="https://rpc.ironforge.network/mainnet?apiKey=..." \
  node tools/analyze-transaction.js \
  31MUMU8oqwyiwct3M9jTnfMAxhXNfNRzRVB3BKRTk4PQQsES2Nyat6yMmBrJUWAKjL9iA26vJMsjHPJqroEYJ1Fc
```

The tool will output:
- Transaction metadata (slot, status, fee)
- Account keys with roles (writable/readonly/signer)
- Instruction analysis (discriminator, account mapping, data encoding)
- Token balance changes
- Transaction logs
- Implementation guide

### 3. Create a Unit Test

Create a unit test colocated with the implementation file that replicates the reference transaction structure and validates it via simulation.

**Example:** `src/protocols/solend/enclave/deposit.test.js`

```javascript
import { describe, test, expect, beforeAll } from 'bun:test';
import { createSolanaRpc } from '@solana/rpc';
import { buildDepositTransaction } from './deposit.js';
import { prepareSolendContext } from '../context/index.js';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Reference transaction that successfully deposited 1 USDC
const REFERENCE_TX = {
  user: '8NrfbE3tvMAbLisd4Dbp7Ja6dmLqdCe3n4Lr9Wq8d9UL',
  amount: 1000000,
  discriminator: 14,
  accountCount: 14
};

describe('Solend Deposit', () => {
  let rpc;
  let userContext;
  let prepared;

  beforeAll(async () => {
    rpc = createSolanaRpc(RPC_URL);

    // Prepare context once for all tests
    userContext = { wallet: REFERENCE_TX.user, origin: 'https://test.sona.build' };
    prepared = await prepareSolendContext({
      rpc,
      context: userContext,
    });
  });

  test('should replicate reference transaction and pass simulation', async () => {
    const params = {
      amount: REFERENCE_TX.amount
    };

    const result = buildDepositTransaction(params, userContext, prepared);

    // Simulate transaction using RPC
    const simulation = await rpc.simulateTransaction(result.wireTransaction, {
      commitment: 'confirmed',
      encoding: 'base64',
      replaceRecentBlockhash: true
    }).send();

    // Assert simulation passes
    expect(simulation.value.err).toBeNull();
    expect(simulation.value.logs).toBeDefined();

    // Verify the instruction executed correctly
    const depositLog = simulation.value.logs.find(log =>
      log.includes('Deposit Reserve Liquidity and Obligation Collateral')
    );
    expect(depositLog).toBeDefined();
  }, 30000);
});
```

### 4. Implement the Builder

Using the analysis from step 2, implement the transaction builder:

```javascript
// src/protocols/solend/enclave/deposit.js

import { address } from '@solana/addresses';
import {
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction
} from '@solana/transaction-messages';
import { pipe } from '@solana/functional';
import { AccountRole } from '@solana/instructions';
import { compileTransaction, getBase64EncodedWireTransaction } from '@solana/transactions';
import { validateBuiltTransaction } from '../../../shared/builder-utils.js';
import { SOLEND_PROGRAM_ID, INSTRUCTION } from '../shared/constants.js';

export function buildDepositTransaction(params, context, prepared) {
  const { amount } = params;
  const userPubkey = address(context.wallet);
  const { lifetime, userUsdcAta, userCusdcAta, obligationAccount } = prepared;

  // Set discriminator from analysis
  const data = new Uint8Array(9);
  data[0] = INSTRUCTION.DEPOSIT_RESERVE_LIQUIDITY_AND_OBLIGATION_COLLATERAL; // 14
  const view = new DataView(data.buffer);
  view.setBigUint64(1, BigInt(amount), true);

  // Add accounts in exact order from analysis
  const depositInstruction = {
    programAddress: SOLEND_PROGRAM_ID,
    accounts: [
      // Position 0: User USDC ATA
      { address: userUsdcAta, role: AccountRole.WRITABLE },
      // Position 1: User cUSDC ATA
      { address: userCusdcAta, role: AccountRole.WRITABLE },
      // ... (14 accounts total, matching reference transaction)
    ],
    data
  };

  // Build and compile transaction
  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(userPubkey, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
    (tx) => appendTransactionMessageInstruction(depositInstruction, tx)
  );

  const transaction = compileTransaction(txMessage);
  const wireTransaction = getBase64EncodedWireTransaction(transaction);

  validateBuiltTransaction(wireTransaction, 'Solend Deposit');

  return {
    wireTransaction,
    message: txMessage
  };
}
```

### 5. Run Tests

Run the unit tests to validate your implementation:

```bash
SOLANA_RPC_URL="your-rpc-url" bun test src/protocols/solend/enclave/deposit.test.js
```

### 6. Iterate Until Tests Pass

If tests fail:
1. Compare your transaction structure with the reference transaction
2. Check discriminator, account order, and account roles
3. Verify amount encoding (little-endian u64)
4. Check account roles (WRITABLE vs READONLY vs SIGNER)
5. Adjust implementation and re-run tests

## Key Insights from Solend Implementation

### Discriminator Discovery

- Initially thought discriminator 5 was "DepositReserveLiquidityAndObligationCollateral"
- Simulation logs showed discriminator 5 was actually "RedeemReserveCollateral"
- Testing discriminator 14 showed it was the correct one for combined deposit
- **Lesson:** Always validate discriminator via simulation, don't trust assumptions

### Account Roles Matter

- Account roles (WRITABLE vs READONLY) affect instruction interpretation
- `MAIN_POOL_MARKET` must be WRITABLE for discriminator 14 to work correctly
- Wrong roles can cause the program to interpret the instruction differently

### Combined vs Separate Instructions

- Discriminator 14 is an atomic operation that:
  1. Deposits USDC to reserve
  2. Mints cUSDC
  3. Deposits cUSDC to obligation account
- This is different from separate instructions (4 + 10)

## Test Organization

All tests are colocated with their implementation files using the `*.test.js` pattern:

```
src/protocols/solend/
├── enclave/
│   ├── deposit.js          # Implementation
│   ├── deposit.test.js     # Tests colocated
│   ├── withdraw.js         # Implementation
│   └── withdraw.test.js    # Tests colocated
```

### Test Structure

```javascript
describe('Protocol Operation', () => {
  describe('Transaction Structure', () => {
    // Tests for data structure, discriminator, account count, encoding
  });

  describe('Transaction Simulation (TDD)', () => {
    // TDD test that validates against reference transaction
  });

  describe('Constants Validation', () => {
    // Tests for protocol constants
  });
});
```

## Tools

### analyze-transaction.js

Comprehensive transaction analysis tool that outputs all information needed for implementation.

**Usage:**
```bash
SOLANA_RPC_URL="your-rpc-url" node tools/analyze-transaction.js <signature>
```

**Output:**
- Transaction metadata
- Account roles
- Instruction analysis with implementation guide
- Token balance changes
- Logs

## Example: Implementing Withdrawal

To implement withdrawal using this workflow:

1. Find a working Solend withdrawal transaction on Solscan
2. Analyze it: `node tools/analyze-transaction.js <signature>`
3. Create `src/protocols/solend/enclave/withdraw.test.js` with TDD test
4. Implement `buildWithdrawTransaction()` in `withdraw.js` based on analysis
5. Run tests: `bun test src/protocols/solend/enclave/withdraw.test.js`
6. Iterate until tests pass

## Benefits of This Approach

1. **Correctness**: Implementation matches exactly what works on-chain
2. **Confidence**: Simulation tests validate before mainnet deployment
3. **Documentation**: Tests serve as executable documentation
4. **Debugging**: Easy to compare implementation vs reference transaction
5. **Maintainability**: Clear structure for adding new protocols
