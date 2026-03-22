# AGENTS.md - Kintsugi Developer Guide

This file provides guidelines for agentic coding agents working on the Kintsugi codebase.

## Project Overview

> **IMPORTANT**: This project is being rewritten to use **Deno and TypeScript** instead of Go. All new code should be written in TypeScript using Deno as the runtime. Do not write Go code for new features.

Kintsugi is a declarative, reproducible, and isolated modpack manager for games, written in TypeScript/Deno. It uses Deno for both the core engine and user recipes.

## Build Commands

### Running the Application

```bash
# Run the CLI
deno run --allow-all ./src/cli/main.ts

# Run in watch mode during development
deno run --watch --allow-all ./src/cli/main.ts
```

### Running Tests

```bash
# Run all tests
deno test ./src/

# Run tests for a specific module
deno test ./src/fs/

# Run a single test
deno test --filter TestCopyFile ./src/fs/

# Run tests with verbose output
deno test -v ./src/
```

### Development Environment

The project is organized as a Deno project:
- `./src/cli/` - Main CLI application
- `./src/core/` - Core engine
- `./src/plugins/` - Plugin system

Prerequisites:
- Deno 2.0 or higher
- fuse-overlayfs (for modpack execution)

## Code Style Guidelines

### General Principles

- Use modern TypeScript and Deno features
- Keep code simple and readable
- No unnecessary comments (unless explaining complex logic)
- Follow standard TypeScript conventions

### Formatting

- Use `deno fmt` before committing
- Use 4-space indentation
- Keep lines under 100 characters when reasonable
- Group imports: stdlib, then external packages

### Naming Conventions

- **Files**: kebab-case (e.g., `copy_test.ts`, `action.ts`)
- **Types/Interfaces**: PascalCase (e.g., `Action`, `Step`, `Store`)
- **Functions/Methods**: camelCase (e.g., `newStore`, `execute`)
- **Variables/Constants**: camelCase or PascalCase for exported
- **Acronyms**: Keep original case (e.g., `URL`, not `Url`)

### Import Organization

```typescript
import { assertEquals } from "jsr:@std/assert";
import { Context } from "./context.ts";
import { Store } from "./store.ts";
```

### Error Handling

- Use `new Error()` with message strings
- Return errors early, avoid deep nesting
- Handle errors at the appropriate level
- Example pattern:

```typescript
async function doSomething(ctx: Context): Promise<Result> {
    const data = await fetchData();
    if (!data) {
        throw new Error("failed to fetch data");
    }
    // ... rest of function
}
```

### Context Usage

- Pass `Deno.Kv` or custom Context objects for cancellation
- Use `Deno.Kv` for persistent storage in tests
- Check for cancellation in long-running operations

### Testing Conventions

- Test files: `*_test.ts` in same directory as implementation
- Test functions: `Deno.test("name", async (t) => { ... })`
- Use `t.tempDir()` for temporary test files
- Use `t.fail()` or `throw` for setup/assertion failures
- Test structure pattern:

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

### Project Structure

```
kintsugi/
├── src/
│   ├── cli/                # Main CLI application
│   │   ├── main.ts         # CLI entry point
│   │   └── commands/       # CLI command implementations
│   ├── core/               # Core engine
│   │   ├── fs/             # Filesystem operations
│   │   ├── store/          # Nix-style store
│   │   └── primitives/      # Build step actions
│   ├── plugins/            # Plugin system
│   └── interpreter/        # Deno integration
└── docs/                   # Documentation
```

### Module Guidelines

- Each module should have a focused responsibility
- Use interfaces to define contracts (see `src/core/primitives/action.ts`)
- Export only what's necessary
- Use factory functions like `createXxx()` or `newXxx()` for construction

### Common Patterns

#### Action Interface (Primitives)

```typescript
interface Action {
    execute(ctx: Context, step: Step, store: Store): Promise<void>;
}
```

#### Store Usage

```typescript
const store = await Store.create(storeDir);
try {
    // ... use store
} finally {
    await store.close();
}
```

### Linting

Run `deno check` and `deno fmt` before submitting changes:

```bash
deno check ./src/
deno fmt ./src/
```

### Working with the Codebase

- Use Deno for all runtime operations
- Use JSR for package management
- Test files use Deno's built-in test framework
- The codebase is AI-generated - expect inconsistencies and be willing to refactor

### Branching Strategy

- Always create a new branch for each feature, fix, or enhancement
- Branch naming convention: `feature/<name>`, `fix/<name>`, or `refactor/<name>`
- Never commit directly to main/master
- Use Pull Requests for code review before merging

### Test-Driven Development (TDD)

- **Always write tests first** before implementing any feature
- Tests should be placed in `*_test.ts` files next to the implementation
- Show tests to user for review before proceeding with implementation
- Run tests to verify they fail (expected behavior), then implement to make them pass
- Use Deno's built-in test framework
- Follow the same TDD approach for new sources, store operations, or CLI commands
