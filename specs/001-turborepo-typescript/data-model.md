# Data Model: Turborepo TypeScript Library

**Feature**: Turborepo TypeScript Library Migration

## Entities

### Workspace Configuration

**Description**: Root package.json configuration for npm workspaces

| Field | Type | Description |
|-------|------|-------------|
| name | string | Package name (e.g., "@kintsugi/monorepo") |
| private | boolean | Must be true for root |
| workspaces | string[] | Array of workspace patterns (e.g., ["packages/*"]) |
| devDependencies | object | Turborepo and build tools |

**Validation**: 
- `private` MUST be `true`
- `workspaces` MUST include the library package path

---

### Turborepo Configuration

**Description**: turbo.json defining the build pipeline

| Field | Type | Description |
|-------|------|-------------|
| $schema | string | JSON schema for turbo |
| pipeline | object | Task dependencies and caching |

**Pipeline Tasks**:
- `build`: Compiles TypeScript to JavaScript
- `test`: Runs test suite
- `lint`: Lints code
- `typecheck`: Type-checks TypeScript

---

### Library Package

**Description**: The TypeScript library package in packages/library/

| Field | Type | Description |
|-------|------|-------------|
| name | string | Package name (e.g., "@kintsugi/library") |
| version | string | Semantic version (e.g., "0.1.0") |
| main | string | Entry point (e.g., "dist/index.js") |
| types | string | Type definitions (e.g., "dist/index.d.ts") |
| scripts | object | Build, test, lint commands |
| dependencies | object | Runtime dependencies |
| devDependencies | object | Build and test dependencies |

**Validation**:
- `main` MUST point to compiled output
- `types` MUST match main entry
- `scripts.build` MUST produce distributable files

---

### TypeScript Configuration

**Description**: tsconfig.json for the library package

| Field | Type | Description |
|-------|------|-------------|
| compilerOptions | object | TypeScript compiler options |
| include | string[] | Files to include |
| exclude | string[] | Files to exclude |

**Required Compiler Options**:
- `declaration: true` - Generate .d.ts files
- `declarationMap: true` - Source maps for declarations
- `module: ESNext` - ES modules
- `target: ES2020` - Modern JavaScript target
- `strict: true` - Full type safety

---

## State Transitions

### Package States

```
Draft → Ready → Building → Tested → Published
```

| Transition | Trigger | Valid From |
|------------|---------|------------|
| Draft → Ready | Package structure created | Draft |
| Ready → Building | `turbo run build` invoked | Ready |
| Building → Tested | All tests pass | Building |
| Tested → Published | Version bumped and published | Tested |

---

## Validation Rules

1. **Workspace**: All packages in `packages/` MUST have valid `package.json`
2. **Naming**: Package names MUST follow scoped package format (`@scope/name`)
3. **Types**: TypeScript MUST compile without errors
4. **Tests**: All tests MUST pass before publishing
5. **Dependencies**: Circular dependencies between packages are NOT allowed
