# Plan: Rename Derivation → Shard

## Summary
Rename all occurrences of "Derivation"/"derivation" to "Shard"/"shard" across the codebase (SDK, CLI, and documentation). This is a pure renaming refactoring - no behavioral changes.

## Scope Analysis

### Files to Modify (Code)

#### SDK (`packages/sdk/`)
1. **`src/types/derivation.ts`** → rename file to `shard.ts`
   - `interface Derivation` → `interface Shard`
   - `deps?: Derivation[]` → `deps?: Shard[]`
   - `layers: Derivation[]` → `layers: Shard[]`

2. **`src/lib/hash.ts`**
   - `hashDerivation` → `hashShard`
   - `interface Derivation` → `interface Shard`
   - Import: `derivation.ts` → `shard.ts`

3. **`src/lib/modpack.ts`**
   - All `Derivation` type references → `Shard`
   - Import: `derivation.ts` → `shard.ts`
   - `hashDerivation` → `hashShard`

4. **`src/index.ts`**
   - `export * from "./types/derivation.ts"` → `export * from "./types/shard.ts"`

#### CLI (`apps/cli/`)
5. **`src/lib/hash.ts`**
   - `hashDerivation` → `hashShard`
   - Import `Derivation` → `Shard` from SDK

6. **`src/lib/modpack.ts`**
   - All `Derivation` references → `Shard`
   - `hashDerivation` → `hashShard`

7. **`src/interpreter/interpreter.ts`**
   - `InterpretDerivationOptions` → `InterpretShardOptions`
   - `interpretDerivation` → `interpretShard`
   - `derivations` → `shards`
   - `hashedDerivations` → `hashedShards`
   - `finalDerivations` → `finalShards`
   - All `Derivation` type refs → `Shard`
   - Error messages: "Invalid derivation" → "Invalid shard"

8. **`src/commands/build.ts`**
   - `derivations` → `shards`
   - Log message: "derivations" → "shards"

### Files to Modify (Documentation)

9. **`AGENTS.md`**
   - Update interface examples and references

10. **`DEVELOPMENT.md`**
    - Update all derivation references to shard

11. **`MVP.md`**
    - Update `satisfies Derivation` → `satisfies Shard`

12. **`docs/e2e-testing-proposal.md`**
    - Update import and type references

### Files NOT to Modify
- `.git/logs/*` - git history, should not be changed
- `flake.nix` - uses Nix's `mkDerivation` which is unrelated to our codebase

## Implementation Steps

### Step 1: SDK - Core Types
1. Rename `packages/sdk/src/types/derivation.ts` → `shard.ts`
2. Update interface name `Derivation` → `Shard`
3. Update `packages/sdk/src/index.ts` export path

### Step 2: SDK - Lib Functions
1. Update `packages/sdk/src/lib/hash.ts`:
   - Rename function `hashDerivation` → `hashShard`
   - Rename interface `Derivation` → `Shard`
   - Update import path
2. Update `packages/sdk/src/lib/modpack.ts`:
   - Update all type references
   - Update function calls

### Step 3: CLI - Lib
1. Update `apps/cli/src/lib/hash.ts`:
   - Rename `hashDerivation` → `hashShard`
   - Update imports
2. Update `apps/cli/src/lib/modpack.ts`:
   - Update all type references
   - Update function calls

### Step 4: CLI - Interpreter
1. Update `apps/cli/src/interpreter/interpreter.ts`:
   - Rename all functions, interfaces, and variables
   - Update error messages

### Step 5: CLI - Commands
1. Update `apps/cli/src/commands/build.ts`:
   - Update variable names and log messages

### Step 6: Documentation
1. Update all markdown files with shard terminology

### Step 7: Verification
1. Run `deno check ./packages/sdk/` and `deno check ./apps/cli/`
2. Run `deno test ./packages/sdk/` and `deno test ./apps/cli/`
3. Run `deno fmt` on all modified files

## Tradeoffs
- **Breaking change for users**: Any existing modlists using `Derivation` type will need to update to `Shard`. This is acceptable since it's a fundamental rename.
- **Backwards compatibility**: Could add `type Derivation = Shard` as a deprecated alias, but given the project stage, a clean break is preferable.

## Risk Assessment
- **Low risk**: This is purely a rename refactoring with no behavioral changes
- **Medium effort**: ~8 code files + 4 docs files to update
- **Verification**: Type checker and tests will catch any missed references
