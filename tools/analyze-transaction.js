#!/usr/bin/env node
/**
 * Transaction Analysis Tool for TDD Protocol Implementation
 *
 * Usage:
 *   SOLANA_RPC_URL=<rpc-url> node tools/analyze-transaction.mjs <signature>
 *
 * This tool fetches and analyzes an on-chain transaction to help implement
 * protocol builders using a TDD approach.
 *
 * Features:
 * - Handles versioned transactions with Address Lookup Tables (ALTs)
 * - Analyzes inner instructions (where actual protocol calls happen)
 * - Shows account roles and token balance changes
 * - Provides implementation guide for TDD
 */

import { createSolanaRpc } from '@solana/kit';
import bs58 from 'bs58';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

/**
 * Resolve Address Lookup Tables to get full account list
 */
async function resolveAddressLookupTables(rpc, message) {
  const accountKeys = [...message.accountKeys];
  const addressTableLookups = message.addressTableLookups || [];

  if (addressTableLookups.length === 0) {
    return accountKeys; // No ALTs, return static accounts
  }

  console.log(`\nResolving ${addressTableLookups.length} Address Lookup Table(s)...`);

  for (const lookup of addressTableLookups) {
    // Fetch ALT account data
    const altAccount = await rpc.getAccountInfo(lookup.accountKey, { encoding: 'base64' }).send();
    if (!altAccount.value) {
      console.warn(`Warning: Could not fetch ALT ${lookup.accountKey}`);
      continue;
    }

    const altData = Buffer.from(altAccount.value.data[0], 'base64');

    // Parse ALT: skip discriminator (4) + deactivation slot (8) + last extended slot (8) +
    // last extended slot start index (1) + authority (33)
    let offset = 4 + 8 + 8 + 1 + 33;
    const addresses = [];
    while (offset + 32 <= altData.length) {
      const addressBuffer = altData.subarray(offset, offset + 32);
      addresses.push(bs58.encode(addressBuffer));
      offset += 32;
    }

    console.log(`   ALT ${lookup.accountKey}: ${addresses.length} addresses`);

    // Add writable addresses
    lookup.writableIndexes.forEach(idx => {
      if (idx < addresses.length) {
        accountKeys.push(addresses[idx]);
      }
    });

    // Add readonly addresses
    lookup.readonlyIndexes.forEach(idx => {
      if (idx < addresses.length) {
        accountKeys.push(addresses[idx]);
      }
    });
  }

  return accountKeys;
}

/**
 * Get account role (Writable Signer, Readonly, etc.)
 */
function getAccountRole(accountIndex, header, totalAccounts) {
  const numWritableSigned = header.numRequiredSignatures - header.numReadonlySignedAccounts;
  const numWritable = totalAccounts - header.numReadonlyUnsignedAccounts;
  const numWritableUnsigned = numWritable - numWritableSigned;

  if (accountIndex < header.numRequiredSignatures) {
    return accountIndex < numWritableSigned ? 'Writable Signer' : 'Readonly Signer';
  } else {
    const unsignedIdx = accountIndex - header.numRequiredSignatures;
    return unsignedIdx < numWritableUnsigned ? 'Writable' : 'Readonly';
  }
}

/**
 * Analyze instruction data
 */
function analyzeInstructionData(data) {
  const info = {
    discriminator: data[0],
    hex: data.toString('hex'),
    base64: data.toString('base64')
  };

  if (data.length >= 9) {
    const view = new DataView(data.buffer, data.byteOffset + 1, 8);
    info.amount = view.getBigUint64(0, true);
  }

  return info;
}

/**
 * Main transaction analysis
 */
async function analyzeTransaction(signature) {
  const rpc = createSolanaRpc(RPC_URL);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TRANSACTION ANALYSIS FOR TDD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Signature:', signature);
  console.log('RPC:', RPC_URL.split('?')[0]); // Hide API keys

  // Fetch transaction
  console.log('\nFetching transaction...');
  const response = await rpc.getTransaction(signature, {
    encoding: 'json',
    maxSupportedTransactionVersion: 0
  }).send();

  if (!response || !response.transaction) {
    throw new Error('Transaction not found');
  }

  const tx = response;
  const msg = tx.transaction.message;
  const meta = tx.meta;

  console.log('Transaction fetched\n');

  // Resolve Address Lookup Tables
  const allAccountKeys = await resolveAddressLookupTables(rpc, msg);
  const isVersioned = (msg.addressTableLookups?.length || 0) > 0;

  // ============================================
  // BASIC INFO
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BASIC INFORMATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Version:', isVersioned ? '0 (versioned with ALTs)' : 'legacy');
  console.log('Slot:', tx.slot.toString());
  console.log('Block Time:', new Date(Number(tx.blockTime) * 1000).toISOString());
  console.log('Fee:', meta.fee.toString(), 'lamports');
  console.log('Status:', meta.err ? 'Failed' : 'Success');

  if (meta.err) {
    console.log('\nError:', JSON.stringify(meta.err, null, 2));
  }

  // ============================================
  // ACCOUNT KEYS
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ACCOUNT KEYS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const header = msg.header;
  console.log(`Total Accounts: ${allAccountKeys.length}`);
  console.log(`  Static: ${msg.accountKeys.length}`);
  if (isVersioned) {
    console.log(`  From ALTs: ${allAccountKeys.length - msg.accountKeys.length}`);
  }
  console.log();

  allAccountKeys.forEach((key, idx) => {
    const role = getAccountRole(idx, header, msg.accountKeys.length);
    const source = idx < msg.accountKeys.length ? '' : ' (ALT)';
    console.log(`  [${String(idx).padStart(2, '0')}] ${role.padEnd(16)} ${key}${source}`);
  });

  // ============================================
  // OUTER INSTRUCTIONS
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OUTER INSTRUCTIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let mainProtocolIx = null;
  let mainProtocolIxIndex = -1;

  msg.instructions.forEach((ix, ixIdx) => {
    const programId = allAccountKeys[ix.programIdIndex];
    const data = Buffer.from(ix.data, 'base64');
    const info = analyzeInstructionData(data);

    const isComputeBudget = programId.includes('ComputeBudget');
    const isSystemProgram = programId === '11111111111111111111111111111111';

    console.log(`Instruction ${ixIdx + 1}: ${programId}`);
    console.log(`  Type: ${isComputeBudget ? 'Compute Budget' : isSystemProgram ? 'System Program' : 'Protocol'}`);
    console.log(`  Accounts: ${ix.accounts.length}`);

    if (data.length > 0) {
      console.log(`  Discriminator: ${info.discriminator} (0x${info.discriminator.toString(16).padStart(2, '0')})`);
      if (info.amount !== undefined) {
        console.log(`  Amount: ${info.amount.toString()} (${(Number(info.amount) / 1_000_000).toFixed(6)} tokens)`);
      }
    }
    console.log();

    // Track main protocol instruction
    if (!isComputeBudget && !isSystemProgram && mainProtocolIx === null) {
      mainProtocolIx = ix;
      mainProtocolIxIndex = ixIdx;
    }
  });

  // ============================================
  // INNER INSTRUCTIONS (Most Important!)
  // ============================================
  const innerInstructions = meta.innerInstructions || [];

  if (innerInstructions.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('INNER INSTRUCTIONS (Protocol Calls)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    innerInstructions.forEach((innerIxGroup, groupIdx) => {
      console.log(`\nInner instructions for outer instruction ${innerIxGroup.index}:\n`);

      innerIxGroup.instructions.forEach((ix, ixIdx) => {
        const programId = allAccountKeys[ix.programIdIndex];
        const data = Buffer.from(ix.data, 'base64');
        const info = analyzeInstructionData(data);

        const isTokenProgram = programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        const isSolendProgram = programId === 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo';

        console.log(`  Inner ${ixIdx + 1}: ${programId}`);
        console.log(`    Type: ${isSolendProgram ? 'Solend Protocol' : isTokenProgram ? 'SPL Token' : 'Other'}`);
        console.log(`    Discriminator: ${info.discriminator} (0x${info.discriminator.toString(16).padStart(2, '0')})`);

        if (info.amount !== undefined) {
          console.log(`    Amount: ${info.amount.toString()} (${(Number(info.amount) / 1_000_000).toFixed(6)} tokens)`);
        }

        console.log(`    Accounts: ${ix.accounts.length}`);
        console.log(`\n    Account Mapping:`);
        ix.accounts.forEach((accIdx, pos) => {
          const role = getAccountRole(accIdx, header, msg.accountKeys.length);
          console.log(`      [${String(pos).padStart(2, '0')}] ${role.padEnd(16)} → ${allAccountKeys[accIdx]}`);
        });
        console.log();

        // Use inner Solend instruction as main for implementation guide
        if (isSolendProgram && mainProtocolIx === null) {
          mainProtocolIx = { ...ix, accounts: ix.accounts };
          mainProtocolIxIndex = groupIdx;
        }
      });
    });
  }

  // ============================================
  // TOKEN BALANCE CHANGES
  // ============================================
  if (meta.preTokenBalances && meta.postTokenBalances && meta.preTokenBalances.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TOKEN BALANCE CHANGES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const preBalances = meta.preTokenBalances;
    const postBalances = meta.postTokenBalances;

    const changedAccounts = new Set([
      ...preBalances.map(b => b.accountIndex),
      ...postBalances.map(b => b.accountIndex)
    ]);

    for (const accountIndex of changedAccounts) {
      const pre = preBalances.find(b => b.accountIndex === accountIndex);
      const post = postBalances.find(b => b.accountIndex === accountIndex);

      if (pre && post) {
        const preLamports = BigInt(pre.uiTokenAmount.amount);
        const postLamports = BigInt(post.uiTokenAmount.amount);
        const change = postLamports - preLamports;

        if (change !== 0n) {
          const sign = change > 0n ? '+' : '';
          const accountKey = allAccountKeys[accountIndex] || 'unknown';
          console.log(`Account [${accountIndex}]: ${accountKey}`);
          console.log(`  Token: ${pre.mint}`);
          console.log(`  Before: ${pre.uiTokenAmount.uiAmount}`);
          console.log(`  After:  ${post.uiTokenAmount.uiAmount}`);
          console.log(`  Change: ${sign}${change.toString()} (${sign}${(Number(change) / 1_000_000).toFixed(6)} tokens)`);
          console.log();
        }
      }
    }
  }

  // ============================================
  // TRANSACTION LOGS
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TRANSACTION LOGS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  meta.logMessages?.forEach((log, idx) => {
    const isImportant = log.includes('Instruction:') || log.includes('Error') || log.includes('failed');
    const prefix = isImportant ? '*' : ' ';
    console.log(`${prefix}[${String(idx).padStart(2, '0')}] ${log}`);
  });

  // ============================================
  // IMPLEMENTATION GUIDE
  // ============================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('IMPLEMENTATION GUIDE FOR TDD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (mainProtocolIx) {
    const programId = allAccountKeys[mainProtocolIx.programIdIndex];
    const data = Buffer.from(mainProtocolIx.data, 'base64');
    const info = analyzeInstructionData(data);

    console.log('Target Protocol Instruction:');
    console.log(`  Program: ${programId}`);
    console.log(`  Discriminator: ${info.discriminator}`);
    console.log(`  Account Count: ${mainProtocolIx.accounts.length}`);

    if (info.amount !== undefined) {
      console.log(`  Amount: ${info.amount.toString()}`);
    }

    console.log('\nTo implement this in your builder:\n');
    console.log('1. Set the instruction discriminator:');
    console.log(`   data[0] = ${info.discriminator};`);

    if (info.amount !== undefined) {
      console.log('\n2. Encode the amount as little-endian u64:');
      console.log('   const view = new DataView(data.buffer);');
      console.log(`   view.setBigUint64(1, BigInt(amount), true);`);
    }

    console.log(`\n${info.amount !== undefined ? '3' : '2'}. Add ${mainProtocolIx.accounts.length} accounts in this exact order:`);
    mainProtocolIx.accounts.forEach((accIdx, pos) => {
      const role = getAccountRole(accIdx, header, msg.accountKeys.length);
      const accountKey = allAccountKeys[accIdx];
      const roleEnum = role.includes('Writable') && role.includes('Signer') ? 'AccountRole.WRITABLE_SIGNER' :
                       role.includes('Writable') ? 'AccountRole.WRITABLE' :
                       role.includes('Signer') ? 'AccountRole.READONLY_SIGNER' :
                       'AccountRole.READONLY';

      console.log(`   [${String(pos).padStart(2, '0')}] ${roleEnum.padEnd(32)} // ${accountKey}`);
    });

    console.log('\nReference Transaction Constants:\n');
    console.log('const REFERENCE_TX = {');
    console.log(`  user: '${allAccountKeys[0]}',  // Fee payer`);
    if (info.amount !== undefined) {
      console.log(`  amount: ${info.amount.toString()},`);
    }
    console.log(`  discriminator: ${info.discriminator},`);
    console.log(`  accountCount: ${mainProtocolIx.accounts.length}`);
    console.log('};');
  } else {
    console.log('Warning: Could not identify main protocol instruction');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Main execution
const signature = process.argv[2];
if (!signature) {
  console.error('Usage: SOLANA_RPC_URL=<rpc> node tools/analyze-transaction.mjs <signature>');
  console.error('\nExample:');
  console.error('  SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \\');
  console.error('    node tools/analyze-transaction.mjs 5Aa1n...');
  process.exit(1);
}

analyzeTransaction(signature)
  .then(() => {
    console.log('Analysis complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
