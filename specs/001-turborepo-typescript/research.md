# Research: Turborepo TypeScript Library Migration

**Date**: 2026-03-08
**Feature**: Turborepo TypeScript Library Migration

## Decisions Made

### Decision 1: Turborepo with npm workspaces

**Choice**: Use Turborepo as the build orchestrator with npm workspaces for package management.

**Rationale**: Turborepo provides:
- Intelligent build caching (local and remote)
- Parallel execution of independent tasks
- Visualized task graph
- No lock-in (can switch package managers later)

**Alternatives considered**:
- pnpm workspaces: Good but less widespread adoption
- yarn workspaces: Legacy, less performant caching
- Lerna: Deprecated, no longer maintained

---

### Decision 2: Bun as runtime and package manager

**Choice**: Use Bun for runtime, testing, and package management within the library package.

**Rationale**:
- Native TypeScript support (no transpilation needed for dev)
- Fast install times (3x faster than npm)
- Built-in test runner
- Compatible with npm packages

**Alternatives considered**:
- Deno: Already in project but Bun faster for this use case
- Node.js + npm: Slower, more setup required

---

### Decision 3: Nix flake dev environment

**Choice**: Add Bun to the existing Nix flake devShell.

**Rationale**:
- Consistent development environment across machines
- Bun already has nix support via `bunix` or direct installation
- No need for separate tooling installation

**Alternatives considered**:
- nix-darwin: macOS specific
- direnv: Additional tool to manage

---

### Decision 4: Vitest for testing

**Choice**: Use Vitest as the test runner (Bun-compatible).

**Rationale**:
- Compatible with Bun runtime
- Vast ecosystem (compatible with Jest APIs)
- Built-in watch mode
- TypeScript native support

**Alternatives considered**:
- Bun test: Limited ecosystem, less plugins
- Jest: Not Bun-compatible without issues

---

### Decision 5: TDD workflow enforcement

**Choice**: Enforce Red-Green-Refactor TDD cycle for all library code.

**Rationale**: Per Constitution Principle II - TDD is NON-NEGOTIABLE. This ensures:
- Tests written before implementation
- Clear acceptance criteria
- Better design through test-first thinking

---

## Implementation Notes

1. **Turborepo setup**: Requires `turbo.json` at root with pipeline definitions
2. **Workspace config**: Root `package.json` must define `workspaces` array
3. **Library package**: Each package needs own `package.json`, `tsconfig.json`
4. **Nix integration**: Bun can be added to flake via `bunix` or nixpkgs-unstable
5. **Build output**: Use `tsc` for compilation, output to `dist/` folder
