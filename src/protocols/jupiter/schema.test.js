import { describe, test, expect } from 'bun:test';
import { swapOperation, jupiterSchema } from './schema.js';

describe('Jupiter Schema', () => {
  describe('Metadata', () => {
    test('should have correct operation metadata', () => {
      expect(swapOperation.id).toBe('jupiter_swap');
      expect(swapOperation.label).toBe('Jupiter Swap');
      expect(swapOperation.description).toBe('Swap tokens using Jupiter aggregator with optimal routing');
    });

    test('should export operations object', () => {
      expect(jupiterSchema.operations).toBeDefined();
      expect(jupiterSchema.operations.swap).toBe(swapOperation);
    });

    test('should export schema metadata', () => {
      expect(jupiterSchema.id).toBe('jupiter');
      expect(jupiterSchema.label).toBe('Jupiter Aggregator');
      expect(jupiterSchema.operations.swap).toBe(swapOperation);
    });
  });

  describe('Input Validation', () => {
    test('should validate correct input', () => {
      const validInput = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5,
        slippageBps: 50
      };

      const result = swapOperation.validateParams(validInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validInput);
    });

    test('should apply default slippageBps', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(true);
      expect(result.data.slippageBps).toBe(50);
    });

    test('should reject invalid amount (zero)', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 0,
        slippageBps: 50
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('should reject invalid amount (negative)', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: -1,
        slippageBps: 50
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('should reject slippageBps below minimum', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5,
        slippageBps: 0
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('should reject slippageBps above maximum', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5,
        slippageBps: 10001
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('should reject non-integer slippageBps', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5,
        slippageBps: 50.5
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('should reject missing required fields', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112'
        // Missing outputMint and amount
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('should accept maximum valid slippageBps', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5,
        slippageBps: 10000
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(true);
      expect(result.data.slippageBps).toBe(10000);
    });

    test('should accept minimum valid slippageBps', () => {
      const input = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 1.5,
        slippageBps: 1
      };

      const result = swapOperation.validateParams(input);
      expect(result.success).toBe(true);
      expect(result.data.slippageBps).toBe(1);
    });
  });

  describe('Context Validation', () => {
    test('should validate valid prepared context', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        userInputAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userOutputAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        route: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inAmount: '1500000000',
          outAmount: '150000000',
          priceImpactPct: 0.1,
          slippageBps: 50,
          marketInfos: [
            {
              id: 'marketId123',
              label: 'Orca',
              inputMint: 'So11111111111111111111111111111111111111112',
              outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              inAmount: '1500000000',
              outAmount: '150000000',
              feeAmount: '1500000',
              feeMint: 'So11111111111111111111111111111111111111112'
            }
          ]
        },
        transaction: 'base64EncodedTransactionString',
        fees: {
          signatureFeeLamports: 5000,
          prioritizationFeeLamports: 2500,
          rentFeeLamports: 2500
        },
        router: 'Jupiter V6'
      };

      const result = swapOperation.validateContext(context);
      expect(result.success).toBe(true);
    });

    test('should reject context missing lifetime', () => {
      const context = {
        userInputAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userOutputAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        route: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inAmount: '1500000000',
          outAmount: '150000000',
          priceImpactPct: 0.1,
          slippageBps: 50,
          marketInfos: []
        },
        transaction: 'base64EncodedTransactionString'
      };

      const result = swapOperation.validateContext(context);
      expect(result.success).toBe(false);
    });

    test('should reject context with invalid route structure', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        userInputAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userOutputAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        route: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          // Missing required fields: inAmount, outAmount, priceImpactPct
        },
        transaction: 'base64EncodedTransactionString'
      };

      const result = swapOperation.validateContext(context);
      expect(result.success).toBe(false);
    });

    test('should reject context missing transaction data', () => {
      const context = {
        lifetime: {
          blockhash: '4NCYB3kRT8sCNodPNuCZo8VUh4xqpBQxsxed2wd9xaD4',
          lastValidBlockHeight: 1000000n
        },
        userInputAta: 'C2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        userOutputAta: 'D2jDL4pcwpE2pP5EryTGn842JJUJTcurPGZUquQjySxK',
        route: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inAmount: '1500000000',
          outAmount: '150000000',
          priceImpactPct: 0.1,
          slippageBps: 50,
          marketInfos: []
        }
        // Missing transaction field
      };

      const result = swapOperation.validateContext(context);
      expect(result.success).toBe(false);
    });
  });

  describe('Output Validation', () => {
    test('should validate correct output with all fields', () => {
      const validOutput = {
        swap: {
          inputToken: {
            symbol: 'SOL',
            amount: '1.5',
            mint: 'So11111111111111111111111111111111111111112'
          },
          outputToken: {
            symbol: 'USDC',
            estimatedAmount: '150.00',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          },
          route: {
            priceImpact: 0.1,
            slippage: 50,
            marketInfos: [
              {
                id: 'marketId123',
                label: 'Orca',
                inputMint: 'So11111111111111111111111111111111111111112',
                outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                inAmount: '1500000000',
                outAmount: '150000000'
              }
            ]
          }
        }
      };

      const result = swapOperation.validateOutput(validOutput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validOutput);
    });

    test('should validate output without optional marketInfos', () => {
      const output = {
        swap: {
          inputToken: {
            symbol: 'SOL',
            amount: '1.5',
            mint: 'So11111111111111111111111111111111111111112'
          },
          outputToken: {
            symbol: 'USDC',
            estimatedAmount: '150.00',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          },
          route: {
            priceImpact: 0.1,
            slippage: 50
          }
        }
      };

      const result = swapOperation.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should reject output missing swap object', () => {
      const output = {};

      const result = swapOperation.validateOutput(output);
      expect(result.success).toBe(false);
    });

    test('should reject output missing inputToken', () => {
      const output = {
        swap: {
          outputToken: {
            symbol: 'USDC',
            estimatedAmount: '150.00',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          },
          route: {
            priceImpact: 0.1,
            slippage: 50
          }
        }
      };

      const result = swapOperation.validateOutput(output);
      expect(result.success).toBe(false);
    });

    test('should reject output with incomplete inputToken', () => {
      const output = {
        swap: {
          inputToken: {
            symbol: 'SOL'
            // Missing amount and mint
          },
          outputToken: {
            symbol: 'USDC',
            estimatedAmount: '150.00',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          },
          route: {
            priceImpact: 0.1,
            slippage: 50
          }
        }
      };

      const result = swapOperation.validateOutput(output);
      expect(result.success).toBe(false);
    });

    test('should validate route with multiple marketInfos', () => {
      const output = {
        swap: {
          inputToken: {
            symbol: 'SOL',
            amount: '1.5',
            mint: 'So11111111111111111111111111111111111111112'
          },
          outputToken: {
            symbol: 'USDC',
            estimatedAmount: '150.00',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          },
          route: {
            priceImpact: 0.1,
            slippage: 50,
            marketInfos: [
              {
                id: 'market1',
                label: 'Orca',
                inputMint: 'So11111111111111111111111111111111111111112',
                outputMint: 'intermediateToken',
                inAmount: '1500000000',
                outAmount: '75000000'
              },
              {
                id: 'market2',
                label: 'Raydium',
                inputMint: 'intermediateToken',
                outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                inAmount: '75000000',
                outAmount: '150000000'
              }
            ]
          }
        }
      };

      const result = swapOperation.validateOutput(output);
      expect(result.success).toBe(true);
    });
  });

  describe('LLM Integration', () => {
    test('should have example prompts', () => {
      expect(swapOperation.llm.examples).toBeDefined();
      expect(swapOperation.llm.examples.length).toBeGreaterThan(0);
      expect(swapOperation.llm.examples).toContain('Swap 1 SOL for USDC');
      expect(swapOperation.llm.examples).toContain('Exchange 100 USDC to SOL');
    });

    test('should have LLM description', () => {
      expect(swapOperation.llm.description).toBeDefined();
      expect(swapOperation.llm.description).toContain('Jupiter');
      expect(swapOperation.llm.description).toContain('aggregator');
    });

    test('should generate OpenAI tool definition', () => {
      const tool = swapOperation.toToolDefinition();

      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('jupiter_swap');
      expect(tool.function.description).toBe('Swap tokens using Jupiter aggregator on Solana blockchain. Automatically finds the best route across all Solana DEXs. Wallet is automatically provided from user context. IMPORTANT: Use Solana mint addresses - SOL: So11111111111111111111111111111111111111112, USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB, JUP: JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN, BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
      expect(tool.function.parameters).toBeDefined();
      expect(tool.function.parameters.type).toBe('object');
      expect(tool.function.parameters.properties).toBeDefined();
      expect(tool.function.parameters.properties.inputMint).toBeDefined();
      expect(tool.function.parameters.properties.outputMint).toBeDefined();
      expect(tool.function.parameters.properties.amount).toBeDefined();
      expect(tool.function.parameters.properties.slippageBps).toBeDefined();
      expect(tool.function.parameters.required).toContain('inputMint');
      expect(tool.function.parameters.required).toContain('outputMint');
      expect(tool.function.parameters.required).toContain('amount');
    });
  });

  // describe('UI Metadata', () => {
  //   test('should have UI configuration', () => {
  //     expect(swapOperation.ui).toBeDefined();
  //     expect(swapOperation.ui.icon).toBe('🔄');
  //     expect(swapOperation.ui.color).toBe('purple');
  //     expect(swapOperation.ui.category).toBe('Trading');
  //   });
  //
  //   test('should generate confirm message', () => {
  //     const input = {
  //       inputMint: 'So11111111111111111111111111111111111111112',
  //       outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  //       amount: 1.5,
  //       slippageBps: 50
  //     };
  //
  //     const message = swapOperation.ui.confirmMessage(input);
  //     expect(message).toContain('1.5');
  //     expect(message).toContain('SOL');
  //     expect(message).toContain('USDC');
  //     expect(message).toContain('0.5%');
  //   });
  //
  //   test('should generate confirm message for unknown mints', () => {
  //     const input = {
  //       inputMint: 'UnknownMint1111111111111111111111111111111',
  //       outputMint: 'UnknownMint2222222222222222222222222222222',
  //       amount: 100,
  //       slippageBps: 100
  //     };
  //
  //     const message = swapOperation.ui.confirmMessage(input);
  //     expect(message).toContain('100');
  //     expect(message).toContain('1%');
  //     // Should contain abbreviated mint addresses
  //     expect(message).toContain('Unkn...');
  //   });
  // });
});
