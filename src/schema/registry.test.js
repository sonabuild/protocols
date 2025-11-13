/**
 * Schema Registry Tests
 *
 * Unit tests for the schema registry and metadata export functions
 */

import { describe, test, expect } from 'bun:test';
import {
  PROTOCOL_REGISTRY,
  getAllProtocols,
  getProtocol,
  getAllToolDefinitions,
  exportSchemaMetadata
} from './registry.js';

describe('PROTOCOL_REGISTRY', () => {
  test('should contain solend protocol', () => {
    expect(PROTOCOL_REGISTRY).toHaveProperty('solend');
    expect(PROTOCOL_REGISTRY.solend).toBeDefined();
  });

  test('should have valid protocol structure', () => {
    const solend = PROTOCOL_REGISTRY.solend;
    expect(solend.id).toBe('solend');
    expect(solend.label).toBeDefined();
    expect(solend.description).toBeDefined();
    expect(solend.operations).toBeDefined();
    expect(solend.queries).toBeDefined();
  });
});

describe('getAllProtocols', () => {
  test('should return all protocols', () => {
    const protocols = getAllProtocols();
    expect(protocols).toBeDefined();
    expect(protocols.solend).toBeDefined();
  });

  test('should return same reference as PROTOCOL_REGISTRY', () => {
    const protocols = getAllProtocols();
    expect(protocols).toBe(PROTOCOL_REGISTRY);
  });
});

describe('getProtocol', () => {
  test('should return solend protocol', () => {
    const protocol = getProtocol('solend');
    expect(protocol).toBeDefined();
    expect(protocol.id).toBe('solend');
  });

  test('should return null for unknown protocol', () => {
    const protocol = getProtocol('unknown');
    expect(protocol).toBeNull();
  });

  test('should handle undefined input', () => {
    const protocol = getProtocol(undefined);
    expect(protocol).toBeNull();
  });
});

describe('getAllToolDefinitions', () => {
  test('should return array of tool definitions', () => {
    const tools = getAllToolDefinitions();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  test('should contain valid tool definitions', () => {
    const tools = getAllToolDefinitions();

    for (const tool of tools) {
      expect(tool).toHaveProperty('type');
      expect(tool.type).toBe('function');
      expect(tool).toHaveProperty('function');
      expect(tool.function).toHaveProperty('name');
      expect(tool.function).toHaveProperty('description');
      expect(tool.function).toHaveProperty('parameters');
      expect(tool.function.parameters).toHaveProperty('type');
      expect(tool.function.parameters.type).toBe('object');
    }
  });

  test('should include solend deposit operation', () => {
    const tools = getAllToolDefinitions();
    const depositTool = tools.find(t => t.function.name === 'solend_deposit');

    expect(depositTool).toBeDefined();
    expect(depositTool.function.description).toBeDefined();
    expect(depositTool.function.parameters.properties).toBeDefined();
  });

  test('should include proactive queries', () => {
    const tools = getAllToolDefinitions();
    const queryTools = tools.filter(t => t.function.name.includes('solend.query'));

    // Only proactive queries should be included
    for (const tool of queryTools) {
      expect(tool.function.name).toMatch(/^solend\.query\./);
    }
  });
});

describe('exportSchemaMetadata', () => {
  test('should export complete metadata structure', () => {
    const metadata = exportSchemaMetadata();

    expect(metadata).toHaveProperty('routes');
    expect(metadata).toHaveProperty('tools');
    expect(metadata).toHaveProperty('version');
    expect(metadata).toHaveProperty('description');
  });

  test('should include protocol metadata', () => {
    const metadata = exportSchemaMetadata();

    // Routes are now flat with endpoint paths as keys
    expect(metadata.routes['solend/deposit']).toBeDefined();
    expect(metadata.routes['solend/withdraw']).toBeDefined();
    expect(metadata.routes['solend/positions']).toBeDefined();
  });

  test('should include operation metadata', () => {
    const metadata = exportSchemaMetadata();
    const deposit = metadata.routes['solend/deposit'];

    expect(deposit).toBeDefined();
    expect(deposit.protocol).toBe('solend');
    expect(deposit.label).toBeDefined();
    expect(deposit.description).toBeDefined();
    expect(deposit.attested).toBe(true);  // Operations are attested
    expect(deposit.schema).toBeDefined();
    expect(deposit.schema.params).toBeDefined();
    expect(deposit.schema.output).toBeDefined();
    expect(deposit.schema.request).toBeDefined();  // Full API request structure
  });

  test('should include query metadata', () => {
    const metadata = exportSchemaMetadata();
    const positions = metadata.routes['solend/positions'];

    expect(positions).toBeDefined();
    expect(positions.protocol).toBe('solend');
    expect(positions.label).toBeDefined();
    expect(positions.description).toBeDefined();
    expect(positions.attested).toBe(false);  // Queries are not attested
    expect(positions.schema).toBeDefined();
    expect(positions.schema.params).toBeDefined();
    expect(positions.schema.output).toBeDefined();
  });

  test('should include tool definitions in tools array', () => {
    const metadata = exportSchemaMetadata();

    expect(Array.isArray(metadata.tools)).toBe(true);
    expect(metadata.tools.length).toBeGreaterThan(0);

    // Verify tool format
    for (const tool of metadata.tools) {
      expect(tool.type).toBe('function');
      expect(tool.function).toBeDefined();
      expect(tool.function.name).toBeDefined();
      expect(tool.function.description).toBeDefined();
      expect(tool.function.parameters).toBeDefined();
    }
  });

  test('should only include proactive queries in tools', () => {
    const metadata = exportSchemaMetadata();
    const toolNames = metadata.tools.map(t => t.function.name);

    // Proactive queries should be in tools
    expect(toolNames).toContain('solend_positions');

    // Operations should be in tools
    expect(toolNames).toContain('solend_deposit');
    expect(toolNames).toContain('solend_withdraw');
  });

  test('should have matching tools count', () => {
    const metadata = exportSchemaMetadata();
    const allTools = getAllToolDefinitions();

    expect(metadata.tools.length).toBe(allTools.length);
  });
});

describe('Schema metadata JSON structure', () => {
  test('should produce valid JSON Schema', () => {
    const metadata = exportSchemaMetadata();
    const depositSchema = metadata.routes['solend/deposit'].schema;

    // Verify JSON Schema structure
    expect(depositSchema.params.type).toBe('object');
    expect(depositSchema.params.properties).toBeDefined();
    expect(depositSchema.output.type).toBe('object');
    expect(depositSchema.output.properties).toBeDefined();
    expect(depositSchema.request).toBeDefined();  // Full API request structure
  });

  test('should include required fields', () => {
    const metadata = exportSchemaMetadata();
    const depositSchema = metadata.routes['solend/deposit'].schema;

    expect(depositSchema.params.required).toBeDefined();
    expect(Array.isArray(depositSchema.params.required)).toBe(true);
  });

  test('should be serializable to JSON', () => {
    const metadata = exportSchemaMetadata();

    // Should not throw
    const json = JSON.stringify(metadata);
    expect(json).toBeDefined();
    expect(json.length).toBeGreaterThan(0);

    // Should be parseable
    const parsed = JSON.parse(json);
    expect(parsed.routes).toBeDefined();
    expect(parsed.tools).toBeDefined();
  });
});
