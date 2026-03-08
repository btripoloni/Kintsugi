# Library Public API Contract

**Package**: `@kintsugi/library`
**Version**: 0.1.0

## Overview

This document defines the public API contract for the TypeScript library package.

## Entry Points

| Export | Description |
|--------|-------------|
| `index.ts` | Main entry point, exports all public APIs |

## Public API Surface

### Core Functions

```typescript
// Example - actual API will be defined during implementation
export function createLibrary(): Library;
export function initialize(config: Config): Promise<void>;
```

### Types

```typescript
// Example - actual types will be defined during implementation
export interface Library {
  name: string;
  version: string;
  init(): Promise<void>;
}

export interface Config {
  // Configuration options
}
```

## Module Format

- **Module System**: ES Modules (ESM)
- **Type Definitions**: Bundled `.d.ts` files
- **Compatibility**: Node.js 18+, Bun 1.0+

## Dependency Contract

### Runtime Dependencies

- MUST be minimal
- MUST be production-ready
- MUST have security audits

### Peer Dependencies

- None required for initial version

## Versioning

- **Scheme**: Semantic Versioning (semver)
- **Breaking Changes**: MAJOR version bumps
- **New Features**: MINOR version bumps
- **Bug Fixes**: PATCH version bumps

## Changelog

A `CHANGELOG.md` file MUST be maintained with:
- Each version release date
- List of changes grouped by type (Added, Changed, Deprecated, Removed, Fixed, Security)
- Links to related issues/PRs

## Publishing

- Registry: npmjs.com
- Access: Public
- Tag: latest (default)
