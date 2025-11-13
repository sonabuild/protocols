/**
 * Solend Protocol Schema Tests
 *
 * Unit tests for Solend deposit, withdraw, and positions schemas
 */

import { describe, test, expect } from 'bun:test';
import { depositOperation, withdrawOperation, positionsQuery, solendSchema } from './schema.js';

describe('Solend Deposit Operation Schema', () => {
  test('should have correct metadata', () => {
    expect(depositOperation.id).toBe('solend_deposit');
    expect(depositOperation.label).toBe('Deposit USDC');
    expect(depositOperation.description).toContain('Deposit USDC');
  });

  describe('Input Validation', () => {
    test('should validate valid deposit input', () => {
      const input = {
        amount: 100_000_000  // 100 USDC
      };

      const result = depositOperation.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should validate minimum deposit (0.001 USDC)', () => {
      const input = {
        amount: 1000  // 0.001 USDC minimum
      };

      const result = depositOperation.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should validate maximum deposit (1M USDC)', () => {
      const input = {
        amount: 1_000_000_000_000  // 1M USDC maximum
      };

      const result = depositOperation.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should reject amount below minimum', () => {
      const input = {
        amount: 500  // Below 0.001 USDC
      };

      const result = depositOperation.validateParams(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(['amount']);
    });

    test('should reject amount above maximum', () => {
      const input = {
        amount: 2_000_000_000_000  // Above 1M USDC
      };

      const result = depositOperation.validateParams(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(['amount']);
    });


    test('should reject non-integer amounts', () => {
      const input = {
        amount: 100_000_000.5  // Decimals not allowed
      };

      const result = depositOperation.validateParams(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('integer');
    });
  });

  describe('Context Validation', () => {
    test('should validate valid prepared context', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        userUsdcAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userCusdcAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        usdcAtaExists: true,
        cusdcAtaExists: false,
        obligationAccount: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        obligationExists: false,
        accounts: {
          reserve: {
            address: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
            data: [1, 2, 3, 4]
          },
          lendingMarket: {
            address: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
            data: [5, 6, 7, 8]
          }
        }
      };

      const result = depositOperation.validateContext(context);
      expect(result.success).toBe(true);
    });

    test('should reject context missing lifetime', () => {
      const context = {
        userUsdcAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userCusdcAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        usdcAtaExists: true,
        cusdcAtaExists: false,
        obligationAccount: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        obligationExists: false,
        accounts: {
          reserve: {
            address: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
            data: [1, 2, 3, 4]
          },
          lendingMarket: {
            address: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
            data: [5, 6, 7, 8]
          }
        }
      };

      const result = depositOperation.validateContext(context);
      expect(result.success).toBe(false);
    });

    test('should reject context with invalid Solana addresses', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        userUsdcAta: 'invalid-address',
        userCusdcAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        usdcAtaExists: true,
        cusdcAtaExists: false,
        obligationAccount: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        obligationExists: false,
        accounts: {
          reserve: {
            address: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
            data: [1, 2, 3, 4]
          },
          lendingMarket: {
            address: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
            data: [5, 6, 7, 8]
          }
        }
      };

      const result = depositOperation.validateContext(context);
      expect(result.success).toBe(false);
    });

    test('should reject context missing account data', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        userUsdcAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userCusdcAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        usdcAtaExists: true,
        cusdcAtaExists: false,
        obligationAccount: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        obligationExists: false
        // Missing accounts object
      };

      const result = depositOperation.validateContext(context);
      expect(result.success).toBe(false);
    });
  });

  describe('Output Validation', () => {
    test('should validate valid output', () => {
      const output = {
        deposit: {
          amount: '100.00',
          amountRaw: '100000000',
          tokenSymbol: 'USDC',
          tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        }
      };

      const result = depositOperation.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should validate output with optional account', () => {
      const output = {
        deposit: {
          amount: '100.00',
          amountRaw: '100000000',
          tokenSymbol: 'USDC',
          tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          account: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e'
        }
      };

      const result = depositOperation.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should reject missing deposit object', () => {
      const output = {};

      const result = depositOperation.validateOutput(output);
      expect(result.success).toBe(false);
    });
  });

  describe('LLM Integration', () => {
    test('should have LLM metadata', () => {
      expect(depositOperation.llm).toBeDefined();
      expect(depositOperation.llm.description).toContain('Deposit USDC');
    });

    test('should have example queries', () => {
      expect(depositOperation.llm.examples).toBeDefined();
      expect(depositOperation.llm.examples.length).toBeGreaterThan(0);
      expect(depositOperation.llm.examples[0].query).toBeDefined();
      expect(depositOperation.llm.examples[0].params).toBeDefined();
    });

    test('should generate valid OpenAI tool definition', () => {
      const tool = depositOperation.toToolDefinition();

      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('solend_deposit');
      expect(tool.function.description).toContain('Deposit USDC');
      expect(tool.function.parameters.properties.amount).toBeDefined();
      expect(tool.function.parameters.required).toContain('amount');
    });
  });

  describe('Display Data', () => {
    test('should transform params for UI display', () => {
      const params = { amount: 100_000_000 }; // 100 USDC
      const displayData = depositOperation.displayData(params);

      expect(displayData).toBeDefined();
      expect(displayData.deposit).toBeDefined();
      expect(displayData.deposit.amount).toBe('100.00');
      expect(displayData.deposit.amountRaw).toBe('100000000');
      expect(displayData.deposit.tokenSymbol).toBe('USDC');
      expect(displayData.deposit.tokenMint).toBeDefined();
    });

    test('should handle different amounts correctly', () => {
      const testCases = [
        { amount: 1_000_000, expected: '1.00' },
        { amount: 50_000_000, expected: '50.00' },
        { amount: 123_456_789, expected: '123.46' }
      ];

      for (const { amount, expected } of testCases) {
        const displayData = depositOperation.displayData({ amount });
        expect(displayData.deposit.amount).toBe(expected);
      }
    });
  });

  // describe('UI Metadata', () => {
  //   test('should have UI rendering hints', () => {
  //     expect(depositOperation.ui).toBeDefined();
  //     expect(depositOperation.ui.icon).toBe('💰');
  //     expect(depositOperation.ui.color).toBe('green');
  //     expect(depositOperation.ui.category).toBe('Manage Position');
  //     expect(depositOperation.ui.order).toBe(1);
  //   });
  //
  //   test('should have preview template function', () => {
  //     expect(depositOperation.ui.previewTemplate).toBeDefined();
  //     expect(typeof depositOperation.ui.previewTemplate).toBe('function');
  //
  //     const preview = depositOperation.ui.previewTemplate({ amount: 100_000_000 });
  //     expect(preview).toContain('100.00 USDC');
  //   });
  //
  //   test('should have success message function', () => {
  //     expect(depositOperation.ui.successMessage).toBeDefined();
  //     expect(typeof depositOperation.ui.successMessage).toBe('function');
  //
  //     const message = depositOperation.ui.successMessage();
  //     expect(message).toContain('Transaction signed');
  //   });
  // });
});

describe('Solend Withdraw Operation Schema', () => {
  test('should have correct metadata', () => {
    expect(withdrawOperation.id).toBe('solend_withdraw');
    expect(withdrawOperation.label).toBe('Withdraw USDC');
    expect(withdrawOperation.description).toContain('Withdraw USDC');
  });

  describe('Input Validation', () => {
    test('should validate valid withdraw input', () => {
      const input = {
        amount: 50_000_000,  // 50 USDC
      };

      const result = withdrawOperation.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should use same validation rules as deposit', () => {
      // Test minimum
      const minInput = {
        amount: 1000,
      };
      expect(withdrawOperation.validateParams(minInput).success).toBe(true);

      // Test maximum
      const maxInput = {
        amount: 1_000_000_000_000,
      };
      expect(withdrawOperation.validateParams(maxInput).success).toBe(true);

      // Test below minimum
      const belowMin = {
        amount: 500,
      };
      expect(withdrawOperation.validateParams(belowMin).success).toBe(false);
    });
  });

  describe('Context Validation', () => {
    test('should validate valid prepared context', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        userUsdcAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userCusdcAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        usdcAtaExists: true,
        cusdcAtaExists: true,
        obligationAccount: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        obligationExists: true,
        accounts: {
          reserve: {
            address: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
            data: [1, 2, 3, 4]
          },
          lendingMarket: {
            address: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
            data: [5, 6, 7, 8]
          }
        }
      };

      const result = withdrawOperation.validateContext(context);
      expect(result.success).toBe(true);
    });

    test('should use same context schema as deposit', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        userUsdcAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userCusdcAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        usdcAtaExists: true,
        cusdcAtaExists: true,
        obligationAccount: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        obligationExists: true,
        accounts: {
          reserve: {
            address: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
            data: [1, 2, 3, 4]
          },
          lendingMarket: {
            address: 'GvjoVKNjBvQcFaSKUW1gTE7DxhSpjHbE69umVR5nPuQp',
            data: [5, 6, 7, 8]
          }
        }
      };

      // Both should accept same valid context
      expect(depositOperation.validateContext(context).success).toBe(true);
      expect(withdrawOperation.validateContext(context).success).toBe(true);
    });
  });

  describe('Display Data', () => {
    test('should transform params for UI display', () => {
      const params = { amount: 50_000_000 }; // 50 USDC
      const displayData = withdrawOperation.displayData(params);

      expect(displayData).toBeDefined();
      expect(displayData.withdraw).toBeDefined();
      expect(displayData.withdraw.amount).toBe('50.00');
      expect(displayData.withdraw.amountRaw).toBe('50000000');
      expect(displayData.withdraw.tokenSymbol).toBe('USDC');
      expect(displayData.withdraw.tokenMint).toBeDefined();
    });
  });

  describe('LLM Integration', () => {
    test('should generate valid OpenAI tool definition', () => {
      const tool = withdrawOperation.toToolDefinition();

      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('solend_withdraw');
      expect(tool.function.description).toContain('Withdraw USDC');
    });
  });

  // describe('UI Metadata', () => {
  //   test('should have withdraw-specific UI hints', () => {
  //     expect(withdrawOperation.ui.icon).toBe('💸');
  //     expect(withdrawOperation.ui.color).toBe('orange');
  //     expect(withdrawOperation.ui.order).toBe(2);
  //   });
  //
  //   test('should have preview template for withdrawal', () => {
  //     const preview = withdrawOperation.ui.previewTemplate({ amount: 50_000_000 });
  //     expect(preview).toContain('50.00 USDC');
  //     expect(preview).toContain('Withdraw');
  //   });
  // });
});

describe('Solend Positions Query Schema', () => {
  test('should have correct metadata', () => {
    expect(positionsQuery.id).toBe('solend_positions');
    expect(positionsQuery.endpoint).toBe('solend/positions');
    expect(positionsQuery.label).toBe('Your Position');
    expect(positionsQuery.description).toContain('Solend lending position');
  });

  describe('Input Validation', () => {
    test('should validate valid input (no params required)', () => {
      const input = {};

      const result = positionsQuery.validateParams(input);
      expect(result.success).toBe(true);
    });

  });

  describe('Output Validation', () => {
    test('should validate valid position output', () => {
      const output = {
        obligation: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        exists: true,
        depositedUSDC: '100.00 USDC',
        depositedRaw: 100_000_000
      };

      const result = positionsQuery.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should validate output with optional APY', () => {
      const output = {
        obligation: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        exists: true,
        depositedUSDC: '100.00 USDC',
        depositedRaw: 100_000_000,
        apy: 5.2
      };

      const result = positionsQuery.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should validate non-existent position output', () => {
      const output = {
        obligation: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        exists: false,
        depositedUSDC: '0.00 USDC',
        depositedRaw: 0
      };

      const result = positionsQuery.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should reject invalid output schema', () => {
      const output = {
        obligation: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
        exists: true
        // Missing depositedUSDC and depositedRaw
      };

      const result = positionsQuery.validateOutput(output);
      expect(result.success).toBe(false);
    });
  });

  describe('LLM Integration', () => {
    test('should be marked as proactive', () => {
      expect(positionsQuery.llm.canBeProactive).toBe(true);
    });

    test('should generate OpenAI tool for proactive queries', () => {
      const tool = positionsQuery.toToolDefinition();

      expect(tool).not.toBeNull();
      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('solend_positions');
      expect(tool.function.description).toContain('Solend lending position');
    });
  });

  // describe('UI Metadata', () => {
  //   test('should have card display type', () => {
  //     expect(positionsQuery.ui.displayType).toBe('card');
  //     expect(positionsQuery.ui.icon).toBe('📊');
  //     expect(positionsQuery.ui.color).toBe('blue');
  //   });
  //
  //   test('should have card configuration', () => {
  //     expect(positionsQuery.ui.card).toBeDefined();
  //     expect(positionsQuery.ui.card.title).toBeDefined();
  //     expect(positionsQuery.ui.card.subtitle).toBeDefined();
  //     expect(positionsQuery.ui.card.metrics).toBeDefined();
  //   });
  //
  //   test('should have refresh interval', () => {
  //     expect(positionsQuery.ui.refreshInterval).toBe(30000);  // 30 seconds
  //   });
  //
  //   test('card title should vary based on position existence', () => {
  //     const titleFn = positionsQuery.ui.card.title;
  //
  //     const existingTitle = titleFn({ exists: true });
  //     expect(existingTitle).toContain('Position');
  //
  //     const noPositionTitle = titleFn({ exists: false });
  //     expect(noPositionTitle).toContain('No Position');
  //   });
  //
  //   test('card subtitle should show APY for existing positions', () => {
  //     const subtitleFn = positionsQuery.ui.card.subtitle;
  //
  //     const withApy = subtitleFn({ exists: true, apy: 5.2 });
  //     expect(withApy).toContain('5.2');
  //
  //     const withoutApy = subtitleFn({ exists: true });
  //     expect(withoutApy).toContain('APY');
  //   });
  // });
});

describe('Complete Solend Protocol Schema', () => {
  test('should have correct protocol metadata', () => {
    expect(solendSchema.id).toBe('solend');
    expect(solendSchema.label).toBe('Solend USDC');
    expect(solendSchema.description).toContain('Solend');
  });

  test('should include all operations', () => {
    expect(solendSchema.operations.deposit).toBe(depositOperation);
    expect(solendSchema.operations.withdraw).toBe(withdrawOperation);
  });

  test('should include all queries', () => {
    expect(solendSchema.queries.positions).toBe(positionsQuery);
  });

  test('should retrieve operations by key', () => {
    const deposit = solendSchema.getOperation('deposit');
    expect(deposit).toBe(depositOperation);

    const withdraw = solendSchema.getOperation('withdraw');
    expect(withdrawOperation).toBe(withdrawOperation);
  });

  test('should retrieve queries by key', () => {
    const positions = solendSchema.getQuery('positions');
    expect(positions).toBe(positionsQuery);
  });

  test('should generate tool definitions for all operations and proactive queries', () => {
    const tools = solendSchema.getToolDefinitions();

    // Should have 2 operations + 1 proactive query = 3 tools
    expect(tools.length).toBe(3);

    const toolNames = tools.map(t => t.function.name);
    expect(toolNames).toContain('solend_deposit');
    expect(toolNames).toContain('solend_withdraw');
    expect(toolNames).toContain('solend_positions');
  });

  // test('should have protocol-level UI metadata', () => {
  //   expect(solendSchema.ui).toBeDefined();
  //   expect(solendSchema.ui.icon).toBe('🏦');
  //   expect(solendSchema.ui.color).toBe('#7C4DFF');
  //   expect(solendSchema.ui.category).toBe('Lending');
  //   expect(solendSchema.ui.tags).toContain('DeFi');
  //   expect(solendSchema.ui.tags).toContain('USDC');
  // });
});
