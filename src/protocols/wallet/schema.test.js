/**
 * Wallet Protocol Schema Tests
 *
 * Unit tests for wallet balance query and transfer operation schemas
 */

import { describe, test, expect } from 'bun:test';
import { balanceQuery, transferOperation, walletSchema } from './schema.js';

describe('Wallet Balance Query Schema', () => {
  test('should have correct metadata', () => {
    expect(balanceQuery.id).toBe('wallet_balance');
    expect(balanceQuery.endpoint).toBe('wallet/balance');
    expect(balanceQuery.label).toBe('Token Balance');
    expect(balanceQuery.description).toContain('token balances');
  });

  describe('Input Validation', () => {
    test('should validate valid input with symbols', () => {
      const input = {
        symbols: ['USDC', 'SOL']
      };

      const result = balanceQuery.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should validate empty input (no params)', () => {
      const input = {};

      const result = balanceQuery.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should validate input with single symbol', () => {
      const input = {
        symbols: ['USDC']
      };

      const result = balanceQuery.validateParams(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Output Validation', () => {
    test('should validate output with single token', () => {
      const output = {
        address: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        symbol: 'USDC',
        amount: '100.00',
        amountRaw: '100000000',
        decimals: 6,
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      };

      const result = balanceQuery.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should validate output with multiple tokens', () => {
      const output = {
        address: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        balances: {
          SOL: {
            symbol: 'SOL',
            amount: '1.5',
            amountRaw: '1500000000',
            decimals: 9
          },
          USDC: {
            symbol: 'USDC',
            amount: '100.00',
            amountRaw: '100000000',
            decimals: 6,
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          }
        }
      };

      const result = balanceQuery.validateOutput(output);
      expect(result.success).toBe(true);
    });
  });

  describe('LLM Integration', () => {
    test('should be marked as proactive', () => {
      expect(balanceQuery.llm.canBeProactive).toBe(true);
    });

  });
});

describe('Wallet Transfer Operation Schema', () => {
  test('should have correct metadata', () => {
    expect(transferOperation.id).toBe('wallet_transfer');
    expect(transferOperation.label).toBe('Transfer Tokens');
    expect(transferOperation.description).toContain('Transfer SOL or SPL tokens');
  });

  describe('Input Validation', () => {
    test('should validate valid SOL transfer', () => {
      const input = {
        recipient: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
        amount: 1.5,
        symbol: 'SOL'
      };

      const result = transferOperation.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should validate valid USDC transfer', () => {
      const input = {
        recipient: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
        amount: 100,
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC'
      };

      const result = transferOperation.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should validate transfer with memo', () => {
      const input = {
        recipient: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
        amount: 50,
        symbol: 'USDC',
        memo: 'Payment for services'
      };

      const result = transferOperation.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should reject negative amounts', () => {
      const input = {
        recipient: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
        amount: -1.5,
        symbol: 'SOL'
      };

      const result = transferOperation.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('should reject zero amounts', () => {
      const input = {
        recipient: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
        amount: 0,
        symbol: 'SOL'
      };

      const result = transferOperation.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('should reject memo over 566 characters', () => {
      const input = {
        recipient: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
        amount: 1.5,
        symbol: 'SOL',
        memo: 'a'.repeat(567)
      };

      const result = transferOperation.validateParams(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Context Validation', () => {
    test('should validate valid SOL transfer context', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        }
        // No token accounts needed for SOL transfers
      };

      const result = transferOperation.validateContext(context);
      expect(result.success).toBe(true);
    });

    test('should validate valid SPL transfer context with token accounts', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        senderTokenAccount: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        recipientTokenAccount: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'
      };

      const result = transferOperation.validateContext(context);
      expect(result.success).toBe(true);
    });

    test('should reject context missing lifetime', () => {
      const context = {
        senderTokenAccount: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        recipientTokenAccount: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'
      };

      const result = transferOperation.validateContext(context);
      expect(result.success).toBe(false);
    });

    test('should reject context with invalid Solana addresses', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        senderTokenAccount: 'invalid-address',
        recipientTokenAccount: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK'
      };

      const result = transferOperation.validateContext(context);
      expect(result.success).toBe(false);
    });
  });

  describe('Output Validation', () => {
    test('should validate valid SOL transfer output', () => {
      const output = {
        transfer: {
          from: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
          to: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
          amount: '1.5',
          symbol: 'SOL'
        }
      };

      const result = transferOperation.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should validate valid SPL transfer output', () => {
      const output = {
        transfer: {
          from: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
          to: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e',
          amount: '100.00',
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
          memo: 'Payment for services'
        }
      };

      const result = transferOperation.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should reject missing transfer object', () => {
      const output = {};

      const result = transferOperation.validateOutput(output);
      expect(result.success).toBe(false);
    });
  });

  describe('LLM Integration', () => {
    test('should have example prompts', () => {
      expect(transferOperation.llm.examples).toBeDefined();
      expect(transferOperation.llm.examples.length).toBeGreaterThan(0);
    });

    test('should generate valid OpenAI tool definition', () => {
      const tool = transferOperation.toToolDefinition();

      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('wallet_transfer');
      expect(tool.function.description).toContain('Transfer');
      expect(tool.function.parameters.properties.recipient).toBeDefined();
      expect(tool.function.parameters.properties.amount).toBeDefined();
      expect(tool.function.parameters.required).toContain('recipient');
      expect(tool.function.parameters.required).toContain('amount');
    });
  });
});

describe('Complete Wallet Protocol Schema', () => {
  test('should have correct protocol metadata', () => {
    expect(walletSchema.id).toBe('wallet');
    expect(walletSchema.label).toBe('Wallet');
    expect(walletSchema.description).toContain('Wallet operations');
  });

  test('should include all operations', () => {
    expect(walletSchema.operations.transfer).toBe(transferOperation);
  });

  test('should include all queries', () => {
    expect(walletSchema.queries.balance).toBe(balanceQuery);
  });

  test('should retrieve operations by key', () => {
    const transfer = walletSchema.getOperation('transfer');
    expect(transfer).toBe(transferOperation);
  });

  test('should retrieve queries by key', () => {
    const balance = walletSchema.getQuery('balance');
    expect(balance).toBe(balanceQuery);
  });

  test('should generate tool definitions for all operations and proactive queries', () => {
    const tools = walletSchema.getToolDefinitions();

    // Should have 1 operation + 1 proactive query = 2 tools
    expect(tools.length).toBe(2);

    const toolNames = tools.map(t => t.function.name);
    expect(toolNames).toContain('wallet_transfer');
    expect(toolNames).toContain('wallet_balance');
  });
});
