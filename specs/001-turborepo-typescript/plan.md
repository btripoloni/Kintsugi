# Implementation Plan: Turborepo TypeScript Library Migration

**Branch**: `001-turborepo-typescript` | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-turborepo-typescript/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Migrate existing Go-based modpack management library to a new TypeScript library (`kitsugi`) within a Turborepo monorepo structure. The TypeScript library will provide a DSL for declarative modpack management, outputting recipe definitions that the existing Go executor consumes. Sources supported: json, local, URL, vase.

## Technical Context

**Language/Version**: TypeScript 5.x (via Bun)  
**Primary Dependencies**: Bun, Turborepo, TypeScript 5.x  
**Storage**: N/A (library outputs JSON recipe definitions)  
**Testing**: Bun test framework  
**Target Platform**: Node.js / cross-platform  
**Project Type**: library (npm package: `kitsugi`)  
**Performance Goals**: Build caching via Turborepo, fast compilation with Bun  
**Constraints**: Must maintain compatibility with Go executor (recipe JSON format)  
**Scale/Scope**: Single library package initially, extensible for future packages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Code Readability | Code MUST be readable and easy to understand | PASS | TypeScript provides strong typing for clarity |
| II. TDD | TDD MANDATORY for all features | PASS | Will follow Red-Green-Refactor workflow |
| III. Quality Tools | External deps evaluated for necessity/maintenance/security | PASS | Using Bun (fast, maintained) and Turborepo (standard, maintained) |
| IV. Self-Documenting Code | Code SHOULD be self-documenting | PASS | Will use clear naming and structure |
| V. Simplicity and YAGNI | Start simple, avoid over-engineering | PASS | Single package initially, minimal dependencies |

**No violations detected.**

## Project Structure

### Documentation (this feature)

```text
specs/001-turborepo-typescript/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Turborepo monorepo structure
.
├── turbo.json           # Turborepo configuration
├── package.json         # Root workspace config
├── apps/                # Applications (if any)
├── packages/            # Library packages
│   └── kitsugi/         # Main TypeScript library
│       ├── src/
│       │   ├── sources/ # Source handlers (json, local, URL, vase)
│       │   ├── index.ts
│       │   └── types.ts
│       ├── tests/
│       ├── package.json
│       └── tsconfig.json
├── .specify/
└── docs/
    └── sources/         # Source documentation
```

**Structure Decision**: Turborepo monorepo with TypeScript library in `packages/kitsugi/`. Source handlers (json, local, URL, vase) implemented as modules within the library.

## Complexity Tracking

> Not applicable - no Constitution violations detected.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
