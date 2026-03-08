# Quickstart: Turborepo TypeScript Library

**Feature**: Turborepo TypeScript Library Migration

## Prerequisites

- **Bun** (installed via Nix flake or directly)
- **Node.js** (for npm compatibility)
- **Nix** (for development environment)

## Getting Started

### 1. Enter Development Environment

```bash
# Using Nix flake
nix develop

# Or use the dev shell directly
echo 'eval "$(bunx --shell autocomplete-enable)"' >> ~/.bashrc
```

### 2. Install Dependencies

```bash
# From repository root
bun install
```

This will:
- Install all workspace dependencies
- Link packages together
- Prepare turborepo for building

### 3. Build All Packages

```bash
# Build everything
turbo run build

# Build specific package
turbo run build --filter=@kintsugi/library
```

### 4. Run Tests

```bash
# Run all tests
turbo run test

# Run tests for specific package
turbo run test --filter=@kintsugi/library

# Watch mode
turbo run test --filter=@kintsugi/library -- --watch
```

### 5. Type Checking

```bash
# Type-check all packages
turbo run typecheck

# Type-check specific package
turbo run typecheck --filter=@kintsugi/library
```

### 6. Linting

```bash
# Lint all packages
turbo run lint
```

## Development Workflow (TDD)

Follow the Red-Green-Refactor cycle:

1. **Red**: Write a failing test
   ```bash
   # Create test file
   touch packages/library/tests/my-feature.test.ts
   ```

2. **Green**: Make the test pass
   ```bash
   # Implement in src/
   # Run test to verify
   turbo run test --filter=@kintsugi/library
   ```

3. **Refactor**: Improve code while keeping tests passing
   ```bash
   # Edit code
   # Re-run tests
   turbo run test --filter=@kintsugi/library
   ```

## Common Tasks

### Add a New Package

1. Create directory: `packages/new-package/`
2. Add `package.json` with proper workspace structure
3. Run `bun install` to link
4. Add to turbo pipeline in `turbo.json`

### Add a Dependency

```bash
# Add runtime dependency
cd packages/library
bun add some-package

# Add dev dependency
bun add -d some-dev-tool
```

### Publish Package

```bash
# Bump version
cd packages/library
bun version

# Publish to npm
npm publish --access public
```

## Troubleshooting

### "Command not found: turbo"

```bash
# Install turbo globally or use npx
bun add -g turbo
```

### Build cache issues

```bash
# Clear local cache
rm -rf node_modules/.cache

# Clear turbo cache
rm -rf .turbo
```

### TypeScript errors

```bash
# Check TypeScript version
bun x tsc --version

# Run typecheck explicitly
turbo run typecheck --filter=@kintsugi/library
```
