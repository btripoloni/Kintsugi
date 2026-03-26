# AGENTS.md - Kintsugi Developer Guide

This file provides guidelines for agentic coding agents working on the Kintsugi codebase.

---

## 1. Project Overview

> **IMPORTANT**: This project is a **Deno monorepo** (turborepo). All code must be written in TypeScript using Deno as the runtime. Do not write Go code for new features.

Kintsugi is a declarative, reproducible, and isolated modpack manager for games, inspired by Nix. Written in TypeScript/Deno, it uses Deno for both the core engine and user recipes.

### 1.1 Core Principles

- **Declarative**: Define the desired end state; Kintsugi handles achieving it
- **Reproducible**: A build is a pure function of its inputs - identical results anywhere
- **Isolated**: Each build is self-contained and immutable in the Store, enabling multiple versions and rollbacks

### 1.2 Architecture Components

| Component | Responsibility |
|-----------|----------------|
| **SDK** | Library for users to create recipes in TypeScript |
| **CLI** | Command-line interface (run, build, init, etc) |

### 1.3 Workflow
```
Expression (TS) -> Recipe (JSON) -> Build (Store)
```

---

## 2. Monorepo Structure

```
kintsugi/
├── apps/
│   └── cli/                      # CLI application
│       ├── src/
│       │   ├── main.ts           # Entry point
│       │   ├── commands/        # CLI commands
│       │   ├── interpreter/     # Interprets main.ts to recipes
│       │   ├── executor/        # Execution with OverlayFS
│       │   ├── sources/         # Source fetchers (url, local, etc)
│       │   ├── store/           # Recipe and Vase management
│       │   ├── lib/             # Core lib (hash, modpack)
│       │   └── tests/           # CLI tests
│       └── deno.json            # CLI configuration
├── packages/
│   └── sdk/                      # SDK for users to create recipes
│       ├── src/
│       │   ├── types/            # TypeScript types (Derivation, Source, etc)
│       │   ├── lib/             # Helpers (compose, resolveTransitiveLayers)
│       │   └── index.ts          # SDK exports
│       └── deno.json            # SDK configuration
├── deno.json                    # Root configuration
└── AGENTS.md                    # This file
```

---

## 3. Development Workflow

### 3.1 Test-Driven Development (TDD)

**This is mandatory for all implementations.**

1. **Write tests first** before implementing any feature
2. Place tests in `*_test.ts` files next to the implementation
3. Show tests to the user for review before proceeding
4. Run tests to verify they fail (expected behavior)
5. Implement to make tests pass
6. Refactor if needed while keeping tests passing

```typescript
// Test structure pattern
Deno.test("FeatureName", async (t) => {
    // 1. Setup Input
    const tmpDir = await Deno.makeTempDir();
    // ... setup test data

    // 2. Setup Dependencies
    const store = new Store(storeDir);
    await store.init();

    // 3. Execute
    const result = await doSomething(ctx, store);

    // 4. Verify
    assertEquals(result, expected);
});
```

### 3.2 Branch Strategy

- **Always create a new branch** for each feature, fix, or enhancement
- Branch naming convention: `feature/<name>`, `fix/<name>`, or `refactor/<name>`
- **Never commit directly to main/master**
- **Do not make any commits before user reviews the code**
- Use Pull Requests for code review before merging

### 3.3 Start Simple, Iterate

- Begin with minimal implementation
- Add complexity only when needed
- Refactor and improve continuously
- Prioritize correctness over cleverness

---

## 4. Running the Application

### CLI

```bash
# Run from apps/cli
deno run --allow-all ./apps/cli/src/main.ts <command>

# Or use the task
deno task -A ./apps/cli start <command>
```

### SDK

The SDK is published to JSR as `@btripoloni/kintsugi`. Users import it in their modlists:

```typescript
import { Derivation, Source } from "@btripoloni/kintsugi";
```

---

## 5. Running Tests

```bash
# Run all tests
deno test ./apps/cli/
deno test ./packages/sdk/

# Run tests for a specific package
deno test ./packages/sdk/src/lib/

# Run a single test
deno test --filter "TestName" ./

# Run tests with verbose output
deno test -v ./
```

---

## 6. Code Style Guidelines

### 6.1 General Principles

- Use modern TypeScript and Deno features
- Keep code simple and readable
- No unnecessary comments (unless explaining complex logic)
- Follow standard TypeScript conventions

### 6.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `copy_test.ts`, `action.ts` |
| Packages | kebab-case | `kintsugi-cli`, `kintsugi` |
| Types/Interfaces | PascalCase | `Action`, `Step`, `Store` |
| Functions/Methods | camelCase | `newStore`, `execute` |
| Variables/Constants | camelCase | `modlistPath`, `isValid` |
| Acronyms | Keep original | `URL`, not `Url` |

### 6.3 Formatting

- Use `deno fmt` before submitting
- Use 4-space indentation
- Keep lines under 100 characters when reasonable
- Group imports: stdlib, then external packages, then internal

### 6.4 Import Organization

```typescript
// stdlib
import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";

// external packages
import { something } from "npm:some-package";

// internal (SDK)
import { Derivation, Source } from "@btripoloni/kintsugi";
```

### 6.5 Error Handling

- Use `new Error()` with descriptive message strings
- Return errors early, avoid deep nesting
- Handle errors at the appropriate level

---

## 7. Package Configuration

### SDK (packages/sdk/deno.json)

```json
{
  "name": "@btripoloni/kintsugi",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

### CLI (apps/cli/deno.json)

```json
{
  "name": "@btripoloni/kintsugi-cli",
  "tasks": {
    "start": "deno run -A src/main.ts",
    "dev": "deno run -A --watch src/main.ts"
  },
  "imports": {
    "@btripoloni/kintsugi": "jsr:@btripoloni/kintsugi"
  }
}
```

---

## 8. Key Interfaces

### 8.1 Derivation

```typescript
interface Derivation {
  name: string;           // Descriptive name (e.g., "skyrim-se")
  version: string;        // Version (e.g., "1.6.1170")
  out: string;           // Output: "[hash]-[name]-[version]"
  src: Source;           // Source type
  dependencies?: string[]; // List of recipe names (format: "[hash]-[name]-[version]")
  postbuild?: string;    // Shell script executed after source acquisition
}
```

### 8.2 Source Types

| Type | Description | Key Parameters |
|------|-------------|----------------|
| `url` | Download from remote URL | `url`, `sha256`, `unpack?`, `method?`, `headers?` |
| `local` | Copy from local filesystem | `path` |
| `write_json` | Create JSON file | `path`, `content` |
| `vase` | Import from Vase collection | `vase` |
| `composition` | Compose multiple shards | `layers` |

### 8.3 Recipe

```typescript
interface Recipe {
  out: string;           // "[hash]-[name]-[version]"
  src: Fetcher;          // Source type
  dependencies?: string[]; // Recipe names this depends on
}
```

---

## 9. Testing Conventions

- Test files: `*_test.ts` in the same directory as the implementation
- Test functions: `Deno.test("name", async (t) => { ... })`
- Use `t.tempDir()` for temporary test files
- Use `t.fail()` or `throw` for setup/assertion failures

### Test Structure

```typescript
Deno.test("FeatureName", async (t) => {
    // 1. Setup Input
    const tmpDir = await Deno.makeTempDir();
    // ... setup test data

    // 2. Setup Dependencies
    const store = new Store(storeDir);
    await store.init();

    // 3. Execute
    const result = await doSomething(ctx, store);

    // 4. Verify
    assertEquals(result, expected);
});
```

---

## 10. Linting and Verification

**Always run these before submitting:**

```bash
# Check a specific package
deno check ./apps/cli/
deno check ./packages/sdk/

# Format code
deno fmt ./apps/cli/
deno fmt ./packages/sdk/

# Run tests
deno test ./apps/cli/
deno test ./packages/sdk/
```

---

## 11. Module Guidelines

- Each module should have a focused responsibility
- Use interfaces to define contracts
- Export only what's necessary from the SDK
- Use factory functions like `createXxx()` or `newXxx()` for construction

### Store Usage Pattern

```typescript
const store = await Store.create(storeDir);
try {
    // ... use store
} finally {
    await store.close();
}
```

### Paths Module

Use `getKintsugiRoot()` from CLI for handling Kintsugi root path (internal to CLI):

```typescript
import { getKintsugiRoot } from "./paths.ts";

// Returns ~/.kintsugi by default, or custom path via KINTSUGI_ROOT env var or --root flag
const root = getKintsugiRoot();
```

---

## 12. Prerequisites

- Deno 2.0 or higher
- fuse-overlayfs (for modpack execution via OverlayFS)

---

## 13. Publishing the SDK

The SDK is published to JSR:

```bash
# Publish SDK
cd packages/sdk
deno publish
```

---

## 14. Important Notes

1. The codebase is AI-generated - expect inconsistencies and be willing to refactor
2. Always write tests first (TDD)
3. Create a branch for each feature/fix
4. **Do not commit before user reviews the code**
5. Keep iterations small and simple
6. Use Deno for all runtime operations
7. Test files use Deno's built-in test framework
8. Always import from `@btripoloni/kintsugi` in CLI code (not relative paths to SDK source)
