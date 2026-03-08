# Feature Specification: Turborepo TypeScript Library Migration

**Feature Branch**: `001-turborepo-typescript`  
**Created**: 2026-03-08  
**Status**: Draft  
**Input**: User description: "transformar esse repositorio em um turbo repo colocando a reescrevendo a biblioteca typescript dentro do repositorio, a biblioteca vai ser reescrita do zero."

## Clarifications

### Session 2026-03-08

- Q: What functionality will the new TypeScript library provide? → A: Same as original kintsugi - modpack management functionality (declarative, reproducible, isolated modpack management via TypeScript DSL)
- Q: How will the new TypeScript library integrate with the existing Go codebase? → A: Independent TypeScript library - will be published separately, only shares repository for maintenance
- Q: What should be the npm package name? → A: kitsugi (unscoped package name)
- Q: Should the existing Go code remain functional? → A: Yes - Go executor unchanged, TypeScript library provides definitions that Go interpreter executes to generate recipes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set up Turborepo Structure (Priority: P1)

As a developer, I want the repository to be configured as a turborepo so that I can manage multiple packages with optimized build performance.

**Why this priority**: This is the foundational change required for all subsequent work. Without turborepo setup, the migration cannot proceed.

**Independent Test**: Can be tested by running `turbo run build` at the root and verifying all packages build successfully.

**Acceptance Scenarios**:

1. **Given** a clean repository, **When** the turborepo configuration is applied, **Then** the `turbo.json` file exists and is valid
2. **Given** turborepo configured, **When** `npm install` is run at root, **Then** all dependencies are installed and workspaces are linked
3. **Given** turborepo setup complete, **When** `turbo run build` is executed, **Then** all packages build without errors

---

### User Story 2 - Create TypeScript Library Package (Priority: P1)

As a developer, I want a new TypeScript library package in the monorepo so that I can implement the library functionality from scratch.

**Why this priority**: The core goal is to rewrite the library inside the monorepo. This story creates the package structure needed for the rewrite.

**Independent Test**: Can be tested by verifying the package builds independently and can be imported by other packages in the monorepo.

**Acceptance Scenarios**:

1. **Given** turborepo configured, **When** a new TypeScript package is created in `packages/`, **Then** it has proper `package.json`, `tsconfig.json`, and build configuration
2. **Given** new package created, **When** `turbo run build --filter=package-name` is run, **Then** the package compiles to JavaScript
3. **Given** package builds, **When** another package imports it, **Then** the import works correctly

---

### User Story 3 - Implement Library Features (Priority: P2)

As a developer, I want the TypeScript library to provide its intended functionality so that users of the library can benefit from its features.

**Why this priority**: The library rewrite must maintain or improve upon the original functionality. This story delivers the actual library value.

**Independent Test**: Can be tested by running the library's test suite and verifying output matches expected behavior.

**Acceptance Scenarios**:

1. **Given** library package exists, **When** core features are implemented, **Then** all features work as expected
2. **Given** features implemented, **When** tests are run, **Then** all tests pass
3. **Given** library complete, **When** package is built for distribution, **Then** distributable files are generated correctly

---

### User Story 4 - Migrate Existing Code References (Priority: P3)

As a developer, I want to update any references to the old library so that they point to the new monorepo package.

**Why this priority**: Ensures that existing consumers of the library can migrate to the new version without breaking changes.

**Independent Test**: Can be tested by verifying all imports and references work with the new package location.

**Acceptance Scenarios**:

1. **Given** library is rewritten, **When** internal code references the old location, **Then** they are updated to use the new package
2. **Given** references updated, **When** the application runs, **Then** all functionality works correctly

---

### Edge Cases

- What happens when there are circular dependencies between packages?
- How does the build handle packages with failing tests?
- What happens when a new package is added but not configured properly?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST configure turborepo at repository root with valid `turbo.json`
- **FR-002**: System MUST define workspace configuration in `package.json` to include all packages
- **FR-003**: System MUST create a new TypeScript library package named `kitsugi` in `packages/` directory
- **FR-004**: System MUST configure TypeScript compilation for the library package
- **FR-005**: System MUST set up build pipeline in turbo.json for the library package
- **FR-006**: System MUST implement library functionality for declarative modpack management (DSL)
- **FR-007**: System MUST ensure all packages can be built independently via turbo
- **FR-008**: System MUST configure proper dependency linking between packages
- **FR-009**: System MUST set up testing infrastructure for the library package
- **FR-010**: System MUST ensure library outputs recipe format compatible with Go executor

### Key Entities

- **kitsugi Package**: The new TypeScript library package (npm: `kitsugi`)
- **Turborepo Configuration**: Build system configuration file that defines tasks and pipeline
- **Workspace Package**: Individual npm package within the monorepo
- **Build Output**: Compiled JavaScript/TypeScript files ready for distribution
- **Recipe Output**: TypeScript definitions compiled to JSON that Go executor consumes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can run `turbo run build` and all packages build successfully in under 2 minutes
- **SC-002**: The new library package can be imported and used by other packages in the monorepo
- **SC-003**: Library test suite passes with 100% success rate
- **SC-004**: Build caching works - subsequent builds complete 50% faster than initial build
- **SC-005**: Package can be published to npm registry successfully
