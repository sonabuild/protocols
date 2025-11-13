/**
 * Tests for origin validation utilities (security)
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  validateOrigin,
  validateContextOrigin,
  getAllowedOriginsList,
  isLocalhostOrigin
} from './origin.js';

describe('Origin Validation - Security', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
    delete process.env.ALLOWED_ORIGINS;
  });

  describe('validateOrigin - Format Validation', () => {
    test('should reject non-string origins', () => {
      expect(validateOrigin(null).valid).toBe(false);
      expect(validateOrigin(undefined).valid).toBe(false);
      expect(validateOrigin(123).valid).toBe(false);
      expect(validateOrigin({}).valid).toBe(false);
      expect(validateOrigin([]).valid).toBe(false);
    });

    test('should reject empty string', () => {
      const result = validateOrigin('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    test('should reject overly long URLs', () => {
      const longUrl = 'https://' + 'a'.repeat(2050) + '.com';
      const result = validateOrigin(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    test('should reject invalid URL formats', () => {
      expect(validateOrigin('not a url').valid).toBe(false);
      expect(validateOrigin('htp://invalid.com').valid).toBe(false);
      expect(validateOrigin('://no-protocol.com').valid).toBe(false);
      expect(validateOrigin('https://').valid).toBe(false);
    });

    test('should reject invalid protocols', () => {
      const result = validateOrigin('ftp://file-server.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('protocol');
      expect(result.error).toContain('ftp:');
    });

    test('should reject URLs with credentials', () => {
      const withUsername = validateOrigin('https://user@example.com');
      expect(withUsername.valid).toBe(false);
      expect(withUsername.error).toContain('credentials');

      const withPassword = validateOrigin('https://user:pass@example.com');
      expect(withPassword.valid).toBe(false);
      expect(withPassword.error).toContain('credentials');
    });

    test('should reject URLs with @ in hostname', () => {
      // URL parser handles this - either fails parsing or fails allowlist check
      const result = validateOrigin('https://user@example@evil.com');
      expect(result.valid).toBe(false);
      // Error could be parsing error or allowlist rejection
    });

    test('should require hostname', () => {
      // URL parser requires hostname
      const result = validateOrigin('https:///path');
      expect(result.valid).toBe(false);
      // Error message varies by URL parser implementation
    });

    test('should accept valid HTTPS URLs', () => {
      expect(validateOrigin('https://app.sona.fi', { allowlist: ['https://app.sona.fi'] }).valid).toBe(true);
      expect(validateOrigin('https://example.com', { allowlist: ['https://example.com'] }).valid).toBe(true);
      expect(validateOrigin('https://sub.domain.com', { allowlist: ['https://sub.domain.com'] }).valid).toBe(true);
    });

    test('should accept valid HTTP URLs in development', () => {
      process.env.NODE_ENV = 'development';
      const result = validateOrigin('http://localhost:3000');
      expect(result.valid).toBe(true);
    });

    test('should accept URLs with ports', () => {
      process.env.NODE_ENV = 'development';
      expect(validateOrigin('http://localhost:3000').valid).toBe(true);
      expect(validateOrigin('http://localhost:5173').valid).toBe(true);
      expect(validateOrigin('https://app.sona.fi:443', { allowlist: ['https://app.sona.fi:443'] }).valid).toBe(true);
    });

    test('should accept URLs with paths and query strings', () => {
      process.env.NODE_ENV = 'development';
      // Origin typically doesn't include path, but if provided URL should parse correctly
      // Note: strict allowlist matching may reject URLs with paths/query
      const withPath = validateOrigin('http://localhost:3000/path', {
        allowlist: ['http://localhost:3000/path']
      });
      expect(withPath.valid).toBe(true);

      const withQuery = validateOrigin('http://localhost:3000?query=1', {
        allowlist: ['http://localhost:3000?query=1']
      });
      expect(withQuery.valid).toBe(true);
    });
  });

  describe('validateOrigin - Allowlist/Denylist', () => {
    test('should reject origin not in allowlist (strict mode)', () => {
      const result = validateOrigin('https://evil.com', {
        allowlist: ['https://app.sona.fi'],
        strictMode: true
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
      expect(result.error).toContain('evil.com');
    });

    test('should accept origin in allowlist (strict mode)', () => {
      const result = validateOrigin('https://app.sona.fi', {
        allowlist: ['https://app.sona.fi'],
        strictMode: true
      });
      expect(result.valid).toBe(true);
    });

    test('should use default allowlist in production', () => {
      process.env.NODE_ENV = 'production';

      // Default production origins should be allowed
      expect(validateOrigin('https://sona.build').valid).toBe(true);

      // Random origin should be denied
      expect(validateOrigin('https://random.com').valid).toBe(false);
    });

    test('should use expanded allowlist in development', () => {
      process.env.NODE_ENV = 'development';

      // Production origins
      expect(validateOrigin('https://app.sona.fi').valid).toBe(true);

      // Dev origins
      expect(validateOrigin('http://localhost:3000').valid).toBe(true);
      expect(validateOrigin('http://localhost:5173').valid).toBe(true);
      expect(validateOrigin('http://127.0.0.1:3000').valid).toBe(true);

      // Random origin should still be denied
      expect(validateOrigin('https://random.com').valid).toBe(false);
    });

    test('should support custom allowlist via environment variable', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = 'https://custom1.com,https://custom2.com';

      // Custom origins should be allowed
      expect(validateOrigin('https://custom1.com').valid).toBe(true);
      expect(validateOrigin('https://custom2.com').valid).toBe(true);

      // Default origins should still be allowed
      expect(validateOrigin('https://app.sona.fi').valid).toBe(true);
      expect(validateOrigin('http://localhost:3000').valid).toBe(true);
    });

    test('should handle whitespace in custom allowlist', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = ' https://custom1.com , https://custom2.com ';

      expect(validateOrigin('https://custom1.com').valid).toBe(true);
      expect(validateOrigin('https://custom2.com').valid).toBe(true);
    });

    test('should support subdomain matching in non-strict mode', () => {
      const result = validateOrigin('https://test.app.sona.fi', {
        allowlist: ['https://app.sona.fi'],
        strictMode: false
      });
      expect(result.valid).toBe(true);
    });

    test('should reject subdomain in strict mode', () => {
      const result = validateOrigin('https://test.app.sona.fi', {
        allowlist: ['https://app.sona.fi'],
        strictMode: true
      });
      expect(result.valid).toBe(false);
    });

    test('should match exactly in strict mode (default)', () => {
      // Strict mode is default
      const result = validateOrigin('https://app.sona.fi:443', {
        allowlist: ['https://app.sona.fi']
      });
      expect(result.valid).toBe(false); // Port mismatch
    });
  });

  describe('validateOrigin - Security Warnings', () => {
    test('should warn about HTTP in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'http://insecure.com';

      const result = validateOrigin('http://insecure.com');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Insecure origin');
      expect(result.warning).toContain('HTTP');
    });

    test('should not warn about HTTP in development', () => {
      process.env.NODE_ENV = 'development';

      const result = validateOrigin('http://localhost:3000');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    test('should not warn about HTTPS in production', () => {
      process.env.NODE_ENV = 'production';

      const result = validateOrigin('https://app.sona.fi');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('validateContextOrigin', () => {
    test('should reject null context', () => {
      const result = validateContextOrigin(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid context');
    });

    test('should reject undefined context', () => {
      const result = validateContextOrigin(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid context');
    });

    test('should reject non-object context', () => {
      expect(validateContextOrigin('string').valid).toBe(false);
      expect(validateContextOrigin(123).valid).toBe(false);
      expect(validateContextOrigin([]).valid).toBe(false);
    });

    test('should reject context without origin field', () => {
      const result = validateContextOrigin({ wallet: 'abc123' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing origin');
    });

    test('should include operation name in error', () => {
      const result = validateContextOrigin({}, 'Test Operation');
      expect(result.error).toContain('Test Operation');
    });

    test('should validate origin from context', () => {
      process.env.NODE_ENV = 'development';

      const validContext = {
        wallet: 'DemoWallet1111111111111111111111111111111',
        origin: 'http://localhost:3000'
      };

      const result = validateContextOrigin(validContext);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid origin in context', () => {
      const invalidContext = {
        wallet: 'DemoWallet1111111111111111111111111111111',
        origin: 'https://evil.com'
      };

      const result = validateContextOrigin(invalidContext);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    test('should pass through warnings', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'http://insecure.com';

      const context = {
        wallet: 'DemoWallet1111111111111111111111111111111',
        origin: 'http://insecure.com'
      };

      const result = validateContextOrigin(context);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Insecure');
    });
  });

  describe('getAllowedOriginsList', () => {
    test('should return production origins in production', () => {
      process.env.NODE_ENV = 'production';

      const origins = getAllowedOriginsList();
      expect(origins).toContain('https://sona.build');
      expect(origins).not.toContain('http://localhost:3000');
    });

    test('should return expanded list in development', () => {
      process.env.NODE_ENV = 'development';

      const origins = getAllowedOriginsList();
      expect(origins).toContain('https://sona.build');
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://127.0.0.1:3000');
    });

    test('should include custom origins', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = 'https://custom.com';

      const origins = getAllowedOriginsList();
      expect(origins).toContain('https://custom.com');
      expect(origins).toContain('https://sona.build');
    });

    test('should return array of strings', () => {
      const origins = getAllowedOriginsList();
      expect(Array.isArray(origins)).toBe(true);
      expect(origins.length).toBeGreaterThan(0);
      origins.forEach(origin => {
        expect(typeof origin).toBe('string');
      });
    });
  });

  describe('isLocalhostOrigin', () => {
    test('should detect localhost hostname', () => {
      expect(isLocalhostOrigin('http://localhost')).toBe(true);
      expect(isLocalhostOrigin('http://localhost:3000')).toBe(true);
      expect(isLocalhostOrigin('https://localhost')).toBe(true);
      expect(isLocalhostOrigin('https://localhost:5173')).toBe(true);
    });

    test('should detect 127.0.0.1', () => {
      expect(isLocalhostOrigin('http://127.0.0.1')).toBe(true);
      expect(isLocalhostOrigin('http://127.0.0.1:3000')).toBe(true);
      expect(isLocalhostOrigin('https://127.0.0.1')).toBe(true);
    });

    test('should detect 0.0.0.0', () => {
      expect(isLocalhostOrigin('http://0.0.0.0')).toBe(true);
      expect(isLocalhostOrigin('http://0.0.0.0:8080')).toBe(true);
    });

    test('should reject non-localhost origins', () => {
      expect(isLocalhostOrigin('https://app.sona.fi')).toBe(false);
      expect(isLocalhostOrigin('https://example.com')).toBe(false);
      expect(isLocalhostOrigin('https://192.168.1.1')).toBe(false);
    });

    test('should handle invalid URLs gracefully', () => {
      expect(isLocalhostOrigin('not a url')).toBe(false);
      expect(isLocalhostOrigin('')).toBe(false);
      expect(isLocalhostOrigin(null)).toBe(false);
    });

    test('should work with paths', () => {
      expect(isLocalhostOrigin('http://localhost:3000/path')).toBe(true);
      expect(isLocalhostOrigin('http://127.0.0.1:3000/path?query=1')).toBe(true);
    });
  });

  describe('Real-world Attack Scenarios', () => {
    test('should prevent open redirect via malformed origin', () => {
      const attacks = [
        'https://app.sona.fi@evil.com',
        'https://evil.com#app.sona.fi',
        'https://evil.com?origin=app.sona.fi',
        'https://app.sona.fi.evil.com'
      ];

      for (const attack of attacks) {
        const result = validateOrigin(attack);
        if (result.valid) {
          // If it passes format validation, it must fail allowlist check
          expect(result.error || result.warning).toBeDefined();
        }
      }
    });

    test('should prevent SSRF via file:// protocol', () => {
      const result = validateOrigin('file:///etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('protocol');
    });

    test('should prevent SSRF via data: protocol', () => {
      const result = validateOrigin('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
    });

    test('should prevent SSRF via javascript: protocol', () => {
      const result = validateOrigin('javascript:alert(1)');
      expect(result.valid).toBe(false);
    });

    test('should handle IDN homograph attacks', () => {
      // Cyrillic 'а' instead of Latin 'a'
      const homograph = 'https://аpp.sona.fi';
      const result = validateOrigin(homograph);
      // Should fail allowlist check (not exact match)
      expect(result.valid).toBe(false);
    });

    test('should handle URL with null bytes', () => {
      const withNull = 'https://app.sona.fi\x00evil.com';
      const result = validateOrigin(withNull);
      // Should either fail parsing or fail allowlist
      expect(result.valid).toBe(false);
    });

    test('should handle extremely nested subdomains', () => {
      const nested = 'https://a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.app.sona.fi';
      const result = validateOrigin(nested, {
        allowlist: ['https://app.sona.fi'],
        strictMode: true
      });
      expect(result.valid).toBe(false); // Strict mode: no subdomain match
    });

    test('should require exact match for security-critical origins', () => {
      // Common attack: adding extra path/query to bypass checks
      const withPath = 'https://app.sona.fi/../../evil';
      const result = validateOrigin(withPath, {
        allowlist: ['https://app.sona.fi'],
        strictMode: true
      });

      // Should fail strict match (includes path)
      expect(result.valid).toBe(false);
    });
  });

  describe('Integration with Context Preparation', () => {
    test('should validate origin before processing sensitive operations', () => {
      process.env.NODE_ENV = 'development';

      const contexts = [
        {
          wallet: 'DemoWallet1111111111111111111111111111111',
          origin: 'http://localhost:3000'
        },
        {
          wallet: 'DemoWallet1111111111111111111111111111111',
          origin: 'https://app.sona.fi'
        },
        {
          wallet: 'DemoWallet1111111111111111111111111111111',
          origin: 'https://evil.com'
        }
      ];

      const results = contexts.map(ctx => validateContextOrigin(ctx, 'Test Operation'));

      // First two should pass
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);

      // Last one should fail
      expect(results[2].valid).toBe(false);
    });
  });
});
