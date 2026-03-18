# Library Public API Contract

**Package**: `kitsugi`
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
// Source handler functions from docs/sources/

// JSON Source - Serializes object to .json file
export interface JsonSourceOptions {
  path: string;
  content: any;
}
export function json(options: JsonSourceOptions): JsonSourceResult;

// Local Source - Imports from local filesystem
export interface LocalSourceOptions {
  path: string;
}
export function local(options: LocalSourceOptions): LocalSourceResult;

// URL Source - Downloads from remote URL
export interface UrlSourceOptions {
  url: string;
  sha256: string;
  unpack?: boolean;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: string;
}
export function url(options: UrlSourceOptions): UrlSourceResult;

// Vase Source - Imports from Vase collection
export interface VaseSourceOptions {
  vase: string;
}
export function vase(options: VaseSourceOptions): VaseSourceResult;
```

### Types

```typescript
// Source result types
export interface JsonSourceResult {
  type: "json";
  path: string;
  content: any;
}

export interface LocalSourceResult {
  type: "local";
  path: string;
  files: string[];
}

export interface UrlSourceResult {
  type: "url";
  url: string;
  sha256: string;
  unpack?: boolean;
}

export interface VaseResult {
  type: "vase";
  vase: string;
  items: string[];
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
