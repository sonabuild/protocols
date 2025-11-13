/**
 * Base Schema Types Tests
 *
 * Unit tests for OperationSchema, QuerySchema, and ProtocolSchema classes
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { OperationSchema, QuerySchema, ProtocolSchema } from './types.js';
import { SolanaAddress, TokenAmount, WireTransaction } from '../shared/schemas.js';

describe('OperationSchema', () => {
  const testOperationConfig = {
    id: 'test_operation',
    label: 'Test Operation',
    description: 'A test operation for unit testing',
    params: z.object({
      amount: z.number().int().min(1000).max(1000000),
      address: SolanaAddress
    }),
    output: z.object({
      wireTransaction: WireTransaction,
      signature: z.string().optional()
    }),
    llm: {
      description: 'Test operation for LLM',
      intent: ['test', 'demo'],
      requiresApproval: true
    }
  };

  test('should construct with valid config', () => {
    const schema = new OperationSchema(testOperationConfig);

    expect(schema.id).toBe('test_operation');
    expect(schema.label).toBe('Test Operation');
    expect(schema.description).toBe('A test operation for unit testing');
    expect(schema.paramsSchema).toBeDefined();
    expect(schema.outputSchema).toBeDefined();
    expect(schema.llm).toBeDefined();
  });

  describe('Input Validation', () => {
    const schema = new OperationSchema(testOperationConfig);

    test('should validate valid input', () => {
      const input = {
        amount: 5000,
        address: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e'
      };

      const result = schema.validateParams(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });

    test('should reject invalid amount (too small)', () => {
      const input = {
        amount: 500,  // Below minimum
        address: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e'
      };

      const result = schema.validateParams(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(['amount']);
    });

    test('should reject invalid amount (too large)', () => {
      const input = {
        amount: 2000000,  // Above maximum
        address: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e'
      };

      const result = schema.validateParams(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(['amount']);
    });

    test('should reject invalid Solana address', () => {
      const input = {
        amount: 5000,
        address: 'invalid_address'
      };

      const result = schema.validateParams(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(['address']);
    });

    test('should reject missing required fields', () => {
      const input = { amount: 5000 };  // Missing address

      const result = schema.validateParams(input);
      expect(result.success).toBe(false);
    });

    test('parseParams should throw on invalid input', () => {
      const input = { amount: 500 };  // Invalid

      expect(() => schema.parseParams(input)).toThrow();
    });

    test('parseParams should return parsed data on valid input', () => {
      const input = {
        amount: 5000,
        address: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e'
      };

      const parsed = schema.parseParams(input);
      expect(parsed).toEqual(input);
    });
  });

  describe('Output Validation', () => {
    const schema = new OperationSchema(testOperationConfig);

    test('should validate valid output', () => {
      const output = {
        wireTransaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDrcJ4LIpQ8bvl65pOZVdP3wG7lKJ/vR8H6FqNdF1oZGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMrPc7KVlTVwIRRxw5k3kVOsJlqLwLJ8h5U5bk8JG6eLAgICAAEMAgAAAAAQJwAAAAAAAA==',
        signature: '5J9H8Xm2JxHZVwVmKbqBNQGXYt3KzVQMZVwVmKbqBNQGXYt3KzVQMZVwVmKbqBNQGXYt3KzVQMZVwVmKbqBNQGX'
      };

      const result = schema.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should reject invalid wireTransaction', () => {
      const output = {
        wireTransaction: '',  // Empty
        signature: '5J9H8Xm2JxHZVwVmKbqBNQGXYt3KzVQMZVwVmKbqBNQGXYt3KzVQMZVwVmKbqBNQGXYt3KzVQMZVwVmKbqBNQGX'
      };

      const result = schema.validateOutput(output);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Definition Generation', () => {
    const schema = new OperationSchema(testOperationConfig);

    test('should generate valid tool definition', () => {
      const tool = schema.toToolDefinition();

      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('test_operation');
      expect(tool.function.description).toBe('Test operation for LLM');
      expect(tool.function.parameters).toBeDefined();
      expect(tool.function.parameters.type).toBe('object');
      expect(tool.function.parameters.properties).toBeDefined();
      expect(tool.function.parameters.required).toBeDefined();
    });

    test('should include all input fields in parameters', () => {
      const tool = schema.toToolDefinition();

      expect(tool.function.parameters.properties.amount).toBeDefined();
      expect(tool.function.parameters.properties.address).toBeDefined();
    });

    test('should mark required fields correctly', () => {
      const tool = schema.toToolDefinition();

      expect(tool.function.parameters.required).toContain('amount');
      expect(tool.function.parameters.required).toContain('address');
    });
  });

  // describe('Form Config Generation', () => {
  //   const schema = new OperationSchema(testOperationConfig);
  //
  //   test('should generate valid form config', () => {
  //     const formConfig = schema.toFormConfig();
  //
  //     expect(formConfig.fields).toBeDefined();
  //     expect(formConfig.fields.amount).toBeDefined();
  //     expect(formConfig.fields.address).toBeDefined();
  //     expect(formConfig.icon).toBe('🧪');
  //     expect(formConfig.color).toBe('blue');
  //   });
  //
  //   test('should extract field metadata correctly', () => {
  //     const formConfig = schema.toFormConfig();
  //
  //     expect(formConfig.fields.amount.type).toBe('ZodNumber');
  //     expect(formConfig.fields.amount.required).toBe(true);
  //     expect(formConfig.fields.amount.min).toBe(1000);
  //     expect(formConfig.fields.amount.max).toBe(1000000);
  //   });
  // });

  describe('JSON Schema Generation', () => {
    const schema = new OperationSchema(testOperationConfig);

    test('should generate JSON schema for params and output', () => {
      const jsonSchema = schema.toJSONSchema();

      expect(jsonSchema.params).toBeDefined();
      expect(jsonSchema.output).toBeDefined();
      expect(jsonSchema.request).toBeDefined();
    });

    test('should include all params properties in JSON schema', () => {
      const jsonSchema = schema.toJSONSchema();

      expect(jsonSchema.params.properties.amount).toBeDefined();
      expect(jsonSchema.params.properties.address).toBeDefined();
    });
  });
});

describe('QuerySchema', () => {
  const testQueryConfig = {
    id: 'test_query',
    endpoint: 'test/query',
    label: 'Test Query',
    description: 'A test query for unit testing',
    params: z.object({
      address: SolanaAddress
    }),
    output: z.object({
      balance: z.number(),
      exists: z.boolean()
    }),
    llm: {
      description: 'Test query for LLM',
      intent: ['check', 'view'],
      canBeProactive: true
    }
  };

  test('should construct with valid config', () => {
    const schema = new QuerySchema(testQueryConfig);

    expect(schema.id).toBe('test_query');
    expect(schema.endpoint).toBe('test/query');
    expect(schema.label).toBe('Test Query');
    expect(schema.paramsSchema).toBeDefined();
    expect(schema.outputSchema).toBeDefined();
  });

  describe('Input/Output Validation', () => {
    const schema = new QuerySchema(testQueryConfig);

    test('should validate valid input', () => {
      const input = {
        address: '6nmTkHTieHMCFHgq63BovyVSfMsNqrdrwSFtd9mvqR6e'
      };

      const result = schema.validateParams(input);
      expect(result.success).toBe(true);
    });

    test('should validate valid output', () => {
      const output = {
        balance: 1000000,
        exists: true
      };

      const result = schema.validateOutput(output);
      expect(result.success).toBe(true);
    });

    test('should reject invalid output', () => {
      const output = {
        balance: 1000000
        // Missing exists field
      };

      const result = schema.validateOutput(output);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Definition Generation', () => {
    test('should generate tool for proactive queries', () => {
      const schema = new QuerySchema(testQueryConfig);
      const tool = schema.toToolDefinition();

      expect(tool).toBeDefined();
      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('test_query');
    });

    test('should return null for non-proactive queries', () => {
      const config = {
        ...testQueryConfig,
        llm: {
          description: 'Non-proactive query',
          canBeProactive: false
        }
      };
      const schema = new QuerySchema(config);
      const tool = schema.toToolDefinition();

      expect(tool).toBeNull();
    });
  });

  // describe('Card Config Generation', () => {
  //   const schema = new QuerySchema(testQueryConfig);
  //
  //   test('should generate card config', () => {
  //     const cardConfig = schema.toCardConfig();
  //
  //     expect(cardConfig.displayType).toBe('card');
  //     expect(cardConfig.icon).toBe('📊');
  //     expect(cardConfig.outputSchema).toBeDefined();
  //   });
  // });
});

describe('ProtocolSchema', () => {
  const depositOperation = new OperationSchema({
    id: 'deposit',
    label: 'Deposit',
    description: 'Deposit tokens',
    params: z.object({ amount: z.number() }),
    output: z.object({ wireTransaction: WireTransaction }),
    llm: { description: 'Deposit tokens' }
  });

  const withdrawOperation = new OperationSchema({
    id: 'withdraw',
    label: 'Withdraw',
    description: 'Withdraw tokens',
    params: z.object({ amount: z.number() }),
    output: z.object({ wireTransaction: WireTransaction }),
    llm: { description: 'Withdraw tokens' }
  });

  const balanceQuery = new QuerySchema({
    id: 'balance',
    endpoint: 'balance',
    label: 'Balance',
    description: 'Check balance',
    params: z.object({ address: SolanaAddress }),
    output: z.object({ balance: z.number() }),
    llm: { description: 'Check balance', canBeProactive: true }
  });

  const protocolConfig = {
    id: 'test_protocol',
    label: 'Test Protocol',
    description: 'A test protocol',
    operations: {
      deposit: depositOperation,
      withdraw: withdrawOperation
    },
    queries: {
      balance: balanceQuery
    },
    // ui: {
    //   icon: '🏦',
    //   color: '#7C4DFF'
    // }
  };

  test('should construct with valid config', () => {
    const schema = new ProtocolSchema(protocolConfig);

    expect(schema.id).toBe('test_protocol');
    expect(schema.label).toBe('Test Protocol');
    expect(schema.operations).toBeDefined();
    expect(schema.queries).toBeDefined();
  });

  test('should retrieve operations by ID', () => {
    const schema = new ProtocolSchema(protocolConfig);

    const deposit = schema.getOperation('deposit');
    expect(deposit).toBe(depositOperation);

    const withdraw = schema.getOperation('withdraw');
    expect(withdraw).toBe(withdrawOperation);
  });

  test('should retrieve queries by ID', () => {
    const schema = new ProtocolSchema(protocolConfig);

    const balance = schema.getQuery('balance');
    expect(balance).toBe(balanceQuery);
  });

  test('should generate tool definitions for all operations and proactive queries', () => {
    const schema = new ProtocolSchema(protocolConfig);
    const tools = schema.getToolDefinitions();

    // Should have 2 operations + 1 proactive query = 3 tools
    expect(tools.length).toBe(3);

    const toolNames = tools.map(t => t.function.name);
    expect(toolNames).toContain('deposit');
    expect(toolNames).toContain('withdraw');
    expect(toolNames).toContain('balance');
  });

  test('should exclude non-proactive queries from tool definitions', () => {
    const nonProactiveQuery = new QuerySchema({
      id: 'non_proactive',
      endpoint: 'non_proactive',
      label: 'Non Proactive',
      description: 'Non proactive query',
      params: z.object({ address: SolanaAddress }),
      output: z.object({ data: z.string() }),
      llm: { description: 'Non proactive', canBeProactive: false }
    });

    const schema = new ProtocolSchema({
      ...protocolConfig,
      queries: {
        ...protocolConfig.queries,
        nonProactive: nonProactiveQuery
      }
    });

    const tools = schema.getToolDefinitions();

    // Should still have 3 tools (2 operations + 1 proactive query)
    expect(tools.length).toBe(3);

    const toolNames = tools.map(t => t.function.name);
    expect(toolNames).not.toContain('non_proactive');
  });
});
