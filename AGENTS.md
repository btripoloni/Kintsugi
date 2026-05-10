# AGENTS.md - Kintsugi Developer Guide

This file provides guidelines for agentic coding agents working on the Kintsugi codebase.

---

## 1. Project Overview

> **IMPORTANT**: This project is being rewritten to use **Deno and TypeScript** instead of Go. All new code must be written in TypeScript using Deno as the runtime. Do not write Go code for new features.

Kintsugi is a declarative, reproducible, and isolated modpack manager for games, inspired by Nix. Written in TypeScript/Deno, it uses Deno for both the core engine and user recipes.

### 1.1 Core Principles

- **Declarative**: Define the desired end state; Kintsugi handles achieving it
- **Reproducible**: A build is a pure function of its inputs - identical results anywhere
- **Isolated**: Each build is self-contained and immutable in the Store, enabling multiple versions and rollbacks

### 1.2 Architecture Components

| Component | Responsibility |
|-----------|----------------|
| **Interpreter** | Executes TypeScript expressions (`main.ts`) and generates JSON recipes |
| **Compiler** | Reads recipes, downloads sources, mounts builds in the Store |
| **Executor** | Orchestrates interpreter + compiler, provides CLI (`run`, `build`, etc) |

### 1.3 Workflow
```
Expression (TS) -> Recipe (JSON) -> Build (Store)
```

---

## 2. Development Workflow

### 2.1 Test-Driven Development (TDD)

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

### 2.2 Branch Strategy

- **Always create a new branch** for each feature, fix, or enhancement
- Branch naming convention: `feature/<name>`, `fix/<name>`, or `refactor/<name>`
- **Never commit directly to main/master**
- **Do not make any commits before user reviews the code**
- Use Pull Requests for code review before merging

### 2.3 Start Simple, Iterate

- Begin with minimal implementation
- Add complexity only when needed
- Refactor and improve continuously
- Prioritize correctness over cleverness

---

## 3. Running the Application

```bash
# Run the CLI
deno run --allow-all ./src/cli/main.ts <command>

# Run in watch mode during development
deno run --watch --allow-all ./src/cli/main.ts <command>
```

---

## 4. Running Tests

```bash
# Run all tests
deno test ./src/

# Run tests for a specific module
deno test ./src/cli/

# Run a single test
deno test --filter "TestCommandName" ./src/

# Run tests with verbose output
deno test -v ./src/
```

---

## 5. Code Style Guidelines

### 5.1 General Principles

- Use modern TypeScript and Deno features
- Keep code simple and readable
- No unnecessary comments (unless explaining complex logic)
- Follow standard TypeScript conventions

### 5.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `copy_test.ts`, `action.ts` |
| Types/Interfaces | PascalCase | `Action`, `Step`, `Store` |
| Functions/Methods | camelCase | `newStore`, `execute` |
| Variables/Constants | camelCase | `modlistPath`, `isValid` |
| Acronyms | Keep original | `URL`, not `Url` |

### 5.3 Formatting

- Use `deno fmt` before submitting
- Use 4-space indentation
- Keep lines under 100 characters when reasonable
- Group imports: stdlib, then external packages

### 5.4 Import Organization

```typescript
import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { Context } from "./context.ts";
import { Store } from "./store.ts";
```

### 5.5 Error Handling

- Use `new Error()` with descriptive message strings
- Return errors early, avoid deep nesting
- Handle errors at the appropriate level

```typescript
async function fetchData(ctx: Context): Promise<Data> {
    const data = await fetchFromStore(ctx);
    if (!data) {
        throw new Error("failed to fetch data");
    }
    // ... rest of function
}
```

---

## 6. Project Structure

```
kintsugi/
├── src/
│   ├── cli/                      # CLI application
│   │   ├── main.ts               # Entry point
│   │   ├── commands/             # CLI commands
│   │   │   ├── init.ts
│   │   │   ├── compile.ts
│   │   │   └── run.ts
│   │   └── tests/
│   ├── interpreter/              # Interpreter (executes main.ts)
│   │   └── src/
│   │       ├── types/
│   │       │   ├── derivation.ts  # Derivation, BuildOptions types
│   │       │   ├── source.ts      # Source types
│   │       │   └── environment.ts # Execution types
│   │       └── lib/
│   │           ├── modpack.ts    # Dependency resolution
│   │           ├── hash.ts       # Hash generation
│   │           └── environment.ts
│   ├── compiler/                  # Compiler (builds from recipes)
│   │   └── src/
│   │       ├── sources/          # Source implementations
│   │       │   ├── url.ts
│   │       │   ├── local.ts
│   │       │   ├── json.ts
│   │       │   └── composition.ts
│   │       ├── store/            # Store management
│   │       │   └── store.ts
│   │       └── types/
│   │           ├── recipe.ts
│   │           └── fetchers.ts
│   └── core/                      # Shared core
│       └── executor/
│           └── executor.ts       # Execution with OverlayFS
├── docs/                          # Documentation
├── DEVELOPMENT.md                 # Development reference (this is YOUR reference)
└── AGENTS.md                     # This file
```

---

## 7. Key Interfaces

### 7.1 Derivation

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

### 7.2 Source Types

| Type | Description | Key Parameters |
|------|-------------|----------------|
| `url` | Download from remote URL | `url`, `sha256`, `unpack?`, `method?`, `headers?` |
| `local` | Copy from local filesystem | `path` |
| `write_json` | Create JSON file | `path`, `content` |
| `vase` | Import from Vase collection | `vase` |
| `composition` | Compose multiple shards | `layers` |

### 7.3 Recipe

```typescript
interface Recipe {
  out: string;           // "[hash]-[name]-[version]"
  src: Fetcher;          // Source type
  dependencies?: string[]; // Recipe names this depends on
}
```

---

## 8. Testing Conventions

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

## 9. Linting and Verification

**Always run these before submitting:**

```bash
deno check ./src/
deno fmt ./src/
deno test ./src/
```

---

## 10. Module Guidelines

- Each module should have a focused responsibility
- Use interfaces to define contracts
- Export only what's necessary
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

Use `src/core/paths.ts` for handling Kintsugi root path. Never hardcode `.kintsugi` - always use the centralized function:

```typescript
import { getKintsugiRoot } from "../../core/paths.ts";

// Returns ~/.kintsugi by default, or custom path via KINTSUGI_ROOT env var or --root flag
const root = getKintsugiRoot();
```

The function resolves paths in this order:
1. Custom root argument (if provided)
2. `KINTSUGI_ROOT` environment variable
3. `~/.kintsugi` (from HOME environment variable)

---

## 11. Prerequisites

- Deno 2.0 or higher
- fuse-overlayfs (for modpack execution via OverlayFS)

---

## 12. Your Reference: DEVELOPMENT.md

The `DEVELOPMENT.md` file in the root directory contains comprehensive information about:

- Project architecture and components
- CLI commands and usage
- Source types and parameters
- Interpretador and Compiler workflows
- Execution (Run) with OverlayFS
- Vases and Garbage Collection
- Build and Rollback mechanisms
- Technical details (hashing, etc.)

**Always consult DEVELOPMENT.md when implementing features.**

---

## 13. Important Notes

1. The codebase is AI-generated - expect inconsistencies and be willing to refactor
2. Always write tests first (TDD)
3. Create a branch for each feature/fix
4. **Do not commit before user reviews the code**
5. Keep iterations small and simple
6. Use Deno for all runtime operations
7. Test files use Deno's built-in test framework
