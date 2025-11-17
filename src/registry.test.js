/**
 * Tests for Protocol Registry
 */

import { describe, test, expect } from 'bun:test';
import { getProtocol, hasProtocol, listProtocols, exportSchemaMetadata, PROTOCOLS } from './registry.js';

describe('Protocol Registry', () => {
  describe('PROTOCOLS constant', () => {
    test('should contain all expected protocols', () => {
      expect(PROTOCOLS).toHaveProperty('jupiter:swap');
      expect(PROTOCOLS).toHaveProperty('wallet:transfer');
      expect(PROTOCOLS).toHaveProperty('wallet:balance');
      expect(PROTOCOLS).toHaveProperty('solend:deposit');
      expect(PROTOCOLS).toHaveProperty('solend:withdraw');
      expect(PROTOCOLS).toHaveProperty('solend:positions');
    });

    test('should have exactly 6 protocols', () => {
      expect(Object.keys(PROTOCOLS).length).toBe(6);
    });
  });

  describe('getProtocol()', () => {
    test('should return protocol definition for valid protocol:operation', () => {
      const jupiterSwap = getProtocol('jupiter', 'swap');
      expect(jupiterSwap).toBeTruthy();
      expect(jupiterSwap).toHaveProperty('prep');
      expect(jupiterSwap).toHaveProperty('build');
      expect(jupiterSwap).toHaveProperty('post');
    });

    test('should return protocol definition for wallet transfer', () => {
      const walletTransfer = getProtocol('wallet', 'transfer');
      expect(walletTransfer).toBeTruthy();
      expect(walletTransfer).toHaveProperty('prep');
      expect(walletTransfer).toHaveProperty('build');
      expect(walletTransfer).toHaveProperty('post');
    });

    test('should return protocol definition for wallet balance query', () => {
      const walletBalance = getProtocol('wallet', 'balance');
      expect(walletBalance).toBeTruthy();
      expect(walletBalance).toHaveProperty('prep');
      expect(walletBalance).toHaveProperty('post');
      expect(walletBalance.build).toBeUndefined();
    });

    test('should return null for invalid protocol', () => {
      const result = getProtocol('invalid', 'operation');
      expect(result).toBeNull();
    });

    test('should return null for invalid operation', () => {
      const result = getProtocol('wallet', 'invalid');
      expect(result).toBeNull();
    });
  });

  describe('hasProtocol()', () => {
    test('should return true for valid protocol:operation', () => {
      expect(hasProtocol('jupiter', 'swap')).toBe(true);
      expect(hasProtocol('wallet', 'transfer')).toBe(true);
      expect(hasProtocol('wallet', 'balance')).toBe(true);
      expect(hasProtocol('solend', 'deposit')).toBe(true);
      expect(hasProtocol('solend', 'withdraw')).toBe(true);
      expect(hasProtocol('solend', 'positions')).toBe(true);
    });

    test('should return false for invalid protocol', () => {
      expect(hasProtocol('invalid', 'operation')).toBe(false);
    });

    test('should return false for invalid operation', () => {
      expect(hasProtocol('wallet', 'invalid')).toBe(false);
    });
  });

  describe('listProtocols()', () => {
    test('should return array of all protocol:operation strings', () => {
      const protocols = listProtocols();
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBe(6);
    });

    test('should include all expected protocol:operation strings', () => {
      const protocols = listProtocols();
      expect(protocols).toContain('jupiter:swap');
      expect(protocols).toContain('wallet:transfer');
      expect(protocols).toContain('wallet:balance');
      expect(protocols).toContain('solend:deposit');
      expect(protocols).toContain('solend:withdraw');
      expect(protocols).toContain('solend:positions');
    });
  });

  describe('exportSchemaMetadata()', () => {
    test('should return metadata with version 2.0', () => {
      const metadata = exportSchemaMetadata();
      expect(metadata.version).toBe('2.0');
    });

    test('should include protocols list', () => {
      const metadata = exportSchemaMetadata();
      expect(metadata).toHaveProperty('protocols');
      expect(Array.isArray(metadata.protocols)).toBe(true);
      expect(metadata.protocols.length).toBe(6);
    });

    test('should include routes object', () => {
      const metadata = exportSchemaMetadata();
      expect(metadata).toHaveProperty('routes');
      expect(typeof metadata.routes).toBe('object');
    });

    test('should format routes with protocol/operation key format', () => {
      const metadata = exportSchemaMetadata();
      expect(metadata.routes).toHaveProperty('jupiter/swap');
      expect(metadata.routes).toHaveProperty('wallet/transfer');
      expect(metadata.routes).toHaveProperty('wallet/balance');
      expect(metadata.routes).toHaveProperty('solend/deposit');
    });

    test('should mark operations (with build) as attested', () => {
      const metadata = exportSchemaMetadata();
      expect(metadata.routes['jupiter/swap'].type).toBe('operation');
      expect(metadata.routes['jupiter/swap'].attested).toBe(true);
      expect(metadata.routes['wallet/transfer'].type).toBe('operation');
      expect(metadata.routes['wallet/transfer'].attested).toBe(true);
    });

    test('should mark queries (without build) as non-attested', () => {
      const metadata = exportSchemaMetadata();
      expect(metadata.routes['wallet/balance'].type).toBe('query');
      expect(metadata.routes['wallet/balance'].attested).toBe(false);
      expect(metadata.routes['solend/positions'].type).toBe('query');
      expect(metadata.routes['solend/positions'].attested).toBe(false);
    });

    test('should include protocol and operation in each route', () => {
      const metadata = exportSchemaMetadata();
      const jupiterSwap = metadata.routes['jupiter/swap'];
      expect(jupiterSwap.protocol).toBe('jupiter');
      expect(jupiterSwap.operation).toBe('swap');
    });

    test('should have exactly 6 routes', () => {
      const metadata = exportSchemaMetadata();
      expect(Object.keys(metadata.routes).length).toBe(6);
    });
  });
});
