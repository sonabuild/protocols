# Contributing to @sonabuild/protocols

Thank you for your interest in contributing to Sona's protocol implementations!

## Purpose of This Repository

This repository is maintained by Sona for **transparency purposes**. We open-source our protocol transaction builders to demonstrate exactly how we construct attested Solana transactions in AWS Nitro Enclaves.

## Types of Contributions

We welcome the following types of contributions:

### ✅ Bug Reports
If you find a bug, please open an issue with:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)

### ✅ Security Issues
**DO NOT** open public issues for security vulnerabilities. Please email security@sona.build with details.

### ✅ Documentation Improvements
Improvements to README, code comments, or documentation are always welcome:
- Fix typos or unclear explanations
- Add examples or clarifications
- Improve code comments

### ✅ Test Improvements
Additional test coverage is valuable:
- Edge case tests
- Error handling tests
- Integration tests

### ⚠️ Code Changes
We review code changes carefully as this code runs in production enclaves:
- Bug fixes are welcome
- Performance improvements are welcome
- New protocols require discussion (open an issue first)
- Breaking changes require discussion (open an issue first)

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- Node.js v20+ (for some tooling)
- Access to Solana RPC (mainnet-beta)

### Installation

```bash
git clone https://github.com/sonabuild/protocols.git
cd protocols
bun install
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific protocol tests
bun test src/protocols/solend
bun test src/protocols/jupiter
bun test src/protocols/wallet

# Run with coverage
bun test --coverage

# Use custom RPC endpoint
SOLANA_RPC_URL="https://your-rpc-url.com" bun test
```

### Building

```bash
# Build all bundles
bun run build

# Verify bundles import correctly
bun run build:check

# Build specific protocol
bun run build:solend
bun run build:jupiter
bun run build:wallet
```

## Pull Request Process

1. **Fork the repository** and create a branch from `main`

2. **Make your changes**:
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

3. **Run the test suite**:
   ```bash
   bun test
   bun run build
   bun run build:check
   ```

4. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Reference issue numbers if applicable
   - Sign your commits if possible

5. **Open a Pull Request**:
   - Describe what changed and why
   - Reference any related issues
   - Explain how you tested the changes

6. **Code Review**:
   - Address reviewer feedback
   - Keep discussion focused and respectful
   - Be patient - this code runs in production

## Coding Standards

### JavaScript Style

- Use modern ES6+ syntax
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names
- Add JSDoc comments for public APIs
- Follow existing patterns in the codebase

### Test-Driven Development

We follow a strict TDD workflow. See [docs/TDD_WORKFLOW.md](docs/TDD_WORKFLOW.md) for details:

1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green
4. Commit at green state

### Architecture Principles

- **Enclave Safety**: Enclave builders must have zero network access
- **Pure Functions**: Builders should be deterministic and reproducible
- **Schema-First**: Define schemas before implementation
- **Origin Validation**: Always validate request origin
- **Type Safety**: Use Zod for runtime validation

### Code Organization

```
src/protocols/{protocol}/
├── index.js             # Standardized API exports (required)
├── context/index.js     # Host-side RPC calls (required)
├── enclave/index.js     # Network-isolated builders (required)
├── query/index.js       # Read-only queries (optional)
├── schema.js            # Operation/query schemas (required)
├── shared/              # Protocol-specific utilities (optional)
└── *.test.js            # Tests colocated with code (required)
```

## Adding a New Protocol

If you want to add a new protocol:

1. **Open an issue first** to discuss the protocol
2. **Implement the standardized API**:
   - `prepareContext(operation, config)` - Host-side context preparation
   - `executeQuery(query, config)` - Read-only queries (if applicable)
   - Export `schema`, `operations`, `queries`
3. **Follow existing patterns** - see solend/jupiter/wallet for examples
4. **Write comprehensive tests** - aim for >90% coverage
5. **Update documentation** - README, JSDoc, inline comments
6. **Add build configuration** - package.json scripts and exports

See [README.md#adding-new-protocols](README.md#adding-new-protocols) for detailed steps.

## Testing Guidelines

### Test Structure

```javascript
describe('Protocol Operation', () => {
  describe('Context Preparation', () => {
    test('should fetch required data from RPC', async () => {
      // Test context preparation
    });

    test('should validate origin', async () => {
      // Test origin validation
    });
  });

  describe('Transaction Building', () => {
    test('should build valid transaction', () => {
      // Test enclave builder
    });

    test('should handle edge cases', () => {
      // Test error cases
    });
  });

  describe('Schema Validation', () => {
    test('should validate params', () => {
      // Test param validation
    });

    test('should reject invalid input', () => {
      // Test error handling
    });
  });
});
```

### Test Best Practices

- **Test one thing per test**: Keep tests focused
- **Use descriptive names**: `test('should reject negative amounts', ...)`
- **Avoid test interdependence**: Each test should be independent
- **Mock external dependencies**: Use test fixtures for RPC responses
- **Test error paths**: Don't just test the happy path
- **Keep tests fast**: Avoid unnecessary delays

### CI/CD

All pull requests must:
- Pass all tests
- Maintain or improve code coverage
- Build successfully
- Have no linting errors

## Questions?

- Open an issue for questions about contributing
- Check existing issues for similar questions
- Read the documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
