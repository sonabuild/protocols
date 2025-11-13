/**
 * Origin Validation Utilities
 *
 * Provides validation for request origins to prevent CSRF and unauthorized access
 */

// Default allowed origins for production
const DEFAULT_ALLOWED_ORIGINS = [
  'https://app.sona.fi',
  'https://sona.fi'
];

// Additional origins for development/testing
const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://test.sona.build' // Test origin used in test files
];

/**
 * Get allowed origins based on environment
 * @returns {string[]} List of allowed origins
 */
function getAllowedOrigins() {
  const env = process.env.NODE_ENV || 'development';
  const customOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

  if (env === 'production') {
    return [...DEFAULT_ALLOWED_ORIGINS, ...customOrigins];
  } else {
    return [...DEFAULT_ALLOWED_ORIGINS, ...DEV_ALLOWED_ORIGINS, ...customOrigins];
  }
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validateUrlFormat(url) {
  if (typeof url !== 'string') {
    return {
      valid: false,
      error: `Origin must be a string, got ${typeof url}`
    };
  }

  if (url.length === 0) {
    return {
      valid: false,
      error: 'Origin cannot be empty'
    };
  }

  if (url.length > 2048) {
    return {
      valid: false,
      error: `Origin too long: ${url.length} characters (max 2048)`
    };
  }

  // Try to parse as URL
  try {
    const parsed = new URL(url);

    // Validate protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: `Invalid protocol: ${parsed.protocol} (must be http: or https:)`
      };
    }

    // Validate no credentials in URL
    if (parsed.username || parsed.password) {
      return {
        valid: false,
        error: 'Origin cannot contain credentials'
      };
    }

    // Validate hostname exists
    if (!parsed.hostname) {
      return {
        valid: false,
        error: 'Origin must have a hostname'
      };
    }

    // Check for suspicious patterns
    if (parsed.hostname.includes('@')) {
      return {
        valid: false,
        error: 'Invalid hostname: contains @ symbol'
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error.message}`
    };
  }
}

/**
 * Validate origin against allowlist
 * @param {string} origin - Origin to validate
 * @param {object} options - Validation options
 * @param {string[]} options.allowlist - Custom allowlist (overrides default)
 * @param {boolean} options.strictMode - Require exact match (default: true)
 * @returns {{valid: boolean, error?: string, warning?: string}}
 */
export function validateOrigin(origin, options = {}) {
  const { allowlist, strictMode = true } = options;

  // First validate URL format
  const formatCheck = validateUrlFormat(origin);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  // Get allowed origins
  const allowedOrigins = allowlist || getAllowedOrigins();

  // Check against allowlist
  const isAllowed = allowedOrigins.some(allowed => {
    if (strictMode) {
      // Exact match
      return origin === allowed;
    } else {
      // Allow subdomains (e.g., https://test.app.sona.fi matches https://app.sona.fi)
      try {
        const originUrl = new URL(origin);
        const allowedUrl = new URL(allowed);
        return originUrl.hostname.endsWith(allowedUrl.hostname);
      } catch {
        return false;
      }
    }
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: `Origin not allowed: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`
    };
  }

  // Warn if using http in production
  if (process.env.NODE_ENV === 'production' && origin.startsWith('http://')) {
    return {
      valid: true,
      warning: `Insecure origin in production: ${origin} (HTTP instead of HTTPS)`
    };
  }

  return { valid: true };
}

/**
 * Validate origin from context object
 * @param {object} context - Context object with origin field
 * @param {string} operationName - Operation name for error messages
 * @returns {{valid: boolean, error?: string, warning?: string}}
 */
export function validateContextOrigin(context, operationName = 'operation') {
  if (!context || typeof context !== 'object') {
    return {
      valid: false,
      error: `Invalid context for ${operationName}: expected object, got ${typeof context}`
    };
  }

  if (!context.origin) {
    return {
      valid: false,
      error: `Missing origin in context for ${operationName}`
    };
  }

  return validateOrigin(context.origin);
}

/**
 * Get current allowed origins (for debugging/logging)
 * @returns {string[]} List of allowed origins
 */
export function getAllowedOriginsList() {
  return getAllowedOrigins();
}

/**
 * Check if origin is localhost (for dev mode checks)
 * @param {string} origin - Origin to check
 * @returns {boolean} True if localhost
 */
export function isLocalhostOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
  } catch {
    return false;
  }
}
