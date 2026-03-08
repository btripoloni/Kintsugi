---

description: "Task list for Turborepo TypeScript Library Migration"
---

# Tasks: Turborepo TypeScript Library Migration

**Input**: Design documents from `/specs/001-turborepo-typescript/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/library-api.md

**Tests**: TDD required per Constitution - tests written first, Red-Green-Refactor cycle

**Organization**: Tasks are grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and turborepo configuration

- [X] T001 [P] Create root `package.json` with npm workspaces configuration in repository root
- [X] T002 [P] Create `turbo.json` with build, test, lint, and typecheck pipeline tasks
- [X] T003 Update `flake.nix` to add Bun to devShell buildInputs
- [X] T004 [P] Create `packages/kitsugi/` directory structure (src/, tests/, types/)
- [X] T005 Run `bun install` to verify workspace linking works

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core package configuration that MUST be complete before library implementation

- [X] T006 Create `packages/kitsugi/package.json` with name "kitsugi", version "0.1.0", and proper scripts
- [X] T007 [P] Create `packages/kitsugi/tsconfig.json` with strict TypeScript configuration
- [X] T008 [P] Create `packages/kitsugi/tsconfig.build.json` for build-specific TypeScript config
- [X] T009 Create `packages/kitsugi/src/index.ts` with minimal exports structure
- [X] T010 Create `packages/kitsugi/tests/index.test.ts` with basic test to verify TDD setup works
- [X] T011 Verify `turbo run build` successfully builds the kitsugi package

---

## Phase 3: User Story 1 - Set up Turborepo Structure (Priority: P1) 🎯 MVP

**Goal**: Repository configured as turborepo with valid build pipeline

**Independent Test**: Run `turbo run build` at root and verify all packages build successfully

### Tests for User Story 1

> NOTE: Write tests FIRST, ensure they FAIL before implementation

- [X] T012 [P] [US1] Add contract test for turbo.json validity in tests/contract/test_turbo_config.test.ts
- [X] T013 [P] [US1] Add contract test for workspace linking in tests/contract/test_workspace.test.ts

### Implementation for User Story 1

- [X] T014 [US1] Verify turbo.json has correct $schema and pipeline definitions
- [X] T015 [US1] Verify package.json workspaces includes "packages/*"
- [X] T016 [US1] Run `turbo run build` and confirm all packages build without errors
- [X] T017 [US1] Run `turbo run test` and confirm all tests pass

**Checkpoint**: Turborepo infrastructure working - can proceed to library implementation

---

## Phase 4: User Story 2 - Create TypeScript Library Package (Priority: P1)

**Goal**: Library package created with proper TypeScript configuration and build output

**Independent Test**: Package builds independently and can be imported by other packages

### Tests for User Story 2 (TDD - Write First, Must FAIL)

> NOTE: Write tests FIRST, ensure they FAIL before implementation

- [ ] T018 [P] [US2] Create test file `packages/kitsugi/tests/contract/test_package_exports.test.ts` that verifies package.json exports field includes "./dist/index.js"
- [ ] T019 [P] [US2] Create test file `packages/kitsugi/tests/contract/test_types.test.ts` that verifies TypeScript declaration files (.d.ts) are generated in dist/

### Implementation for User Story 2

- [ ] T020 [US2] Run tests T018-T019 and confirm they FAIL (Red phase of TDD)
- [ ] T021 [US2] Implement package.json exports field: add "exports" key with "./dist/index.js" entry in `packages/kitsugi/package.json`
- [ ] T022 [US2] Configure TypeScript to generate declaration files: ensure tsconfig.json has "declaration": true and "declarationDir" set in `packages/kitsugi/tsconfig.json`
- [ ] T023 [US2] Run `turbo run build --filter=kitsugi` and verify dist/ contains both .js and .d.ts files
- [ ] T024 [US2] Run tests T018-T019 and confirm they PASS (Green phase of TDD)
- [ ] T025 [US2] Verify package can be imported via `import { ... } from 'kitsugi'` in a test file

**Checkpoint**: Library package structure complete - ready for DSL implementation

---

## Phase 5: User Story 3 - Implement Library Features (Priority: P2)

**Goal**: TypeScript library provides declarative modpack management DSL functionality

**Independent Test**: Tests pass and library produces recipe output compatible with Go executor

### Tests for User Story 3 (TDD - Write First, Must FAIL)

> NOTE: Write tests FIRST, ensure they FAIL before implementation

#### Entity Tests

- [ ] T026 [P] [US3] Create test file `packages/kitsugi/tests/unit/Mod.test.ts` that tests Mod entity with fields: id, name, version, source
- [ ] T027 [P] [US3] Create test file `packages/kitsugi/tests/unit/ModPack.test.ts` that tests ModPack entity with fields: name, version, mods[]
- [ ] T028 [P] [US3] Create test file `packages/kitsugi/tests/unit/Source.test.ts` that tests Source entity with fields: type, url, path

#### Recipe Output Tests

- [ ] T029 [P] [US3] Create test file `packages/kitsugi/tests/unit/Recipe.test.ts` that tests Recipe JSON output structure matches Go executor contract
- [ ] T030 [P] [US3] Create test file `packages/kitsugi/tests/unit/Builder.test.ts` that tests Builder class DSL methods: .mod(), .modPack(), .build()

#### Integration Tests

- [ ] T031 [US3] Create test file `packages/kitsugi/tests/integration/dsl_builder.test.ts` that tests full DSL flow: create modpack with mods, generate recipe

### Implementation for User Story 3

- [ ] T032 [US3] Run tests T026-T031 and confirm they all FAIL (Red phase of TDD)

#### Entity Implementation

- [ ] T033 [US3] Create Mod entity in `packages/kitsugi/src/entities/Mod.ts` with id, name, version, source fields and validation
- [ ] T034 [US3] Create Source entity in `packages/kitsugi/src/entities/Source.ts` with type (curseforge/modrinth/direct), url, path fields
- [ ] T035 [US3] Create ModPack entity in `packages/kitsugi/src/entities/ModPack.ts` with name, version, mods[], metadata fields

#### Service/Builder Implementation

- [ ] T036 [US3] Create Builder class in `packages/kitsugi/src/builder/Builder.ts` with fluent DSL methods: .mod(), .modPack(), .withMods(), .build()
- [ ] T037 [US3] Create RecipeGenerator in `packages/kitsugi/src/output/RecipeGenerator.ts` that converts entities to JSON recipe format

#### Main Export

- [ ] T038 [US3] Update main export file `packages/kitsugi/src/index.ts` to export: Mod, Source, ModPack, Builder, generateRecipe

#### Verify Implementation

- [ ] T039 [US3] Run tests T026-T035 and confirm they PASS (Green phase of TDD)
- [ ] T040 [US3] Run tests T030-T031 for Builder and integration, confirm PASS
- [ ] T041 [US3] Run `turbo run build --filter=kitsugi` and verify recipe JSON output is generated correctly in dist/
- [ ] T042 [US3] Run `turbo run test` and confirm all tests pass

**Checkpoint**: Library features implemented and tested - ready for publishing

---

## Phase 6: User Story 4 - Migrate Existing Code References (Priority: P3)

**Goal**: Update any references to old library location to use new kitsugi package

**Independent Test**: All imports work and functionality runs correctly

### Implementation for User Story 4

- [ ] T043 [US4] Search repository for any existing TypeScript library import paths or references
- [ ] T044 [US4] Update documentation in docs/ that references old library location
- [ ] T045 [US4] Update any import statements that reference old package location
- [ ] T046 [US4] Run tests to verify all imports work correctly after migration

**Checkpoint**: References updated - library ready for use

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and publication preparation

### Tests

- [ ] T047 [P] Verify all existing tests still pass after changes

### Linting & Type Checking

- [ ] T048 [P] Run linting across all packages with `turbo run lint`
- [ ] T049 [P] Run type checking with `turbo run typecheck`

### Documentation & Publishing

- [ ] T050 Create CHANGELOG.md for kitsugi package in `packages/kitsugi/CHANGELOG.md`
- [ ] T051 Add repository badges and links in `packages/kitsugi/package.json` (repository, homepage, bugs)
- [ ] T052 Verify npm publish will work by running `npm publish --dry-run` in packages/kitsugi/
- [ ] T053 Build final package and verify dist/ contains all required files (index.js, index.d.ts, package.json)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - US1 (P1) and US2 (P1) can run in parallel after Foundation
  - US3 (P2) depends on US2 completion
  - US4 (P3) depends on US3 completion
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - No dependencies on other stories
- **US2 (P1)**: Can start after Foundational - No dependencies on other stories
- **US3 (P2)**: Depends on US2 (needs package structure to implement features)
- **US4 (P3)**: Depends on US3 (needs features to update references)

### Within Each User Story (TDD Workflow)

1. Write tests FIRST (T026-T031, T018-T019) - they must FAIL
2. Implement entities/services (T033-T038) - step by step
3. Run tests after each implementation - they should PASS
4. Refactor if needed
5. Verify build works
6. Move to next story

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- US1 and US2 can run in parallel (both P1)
- Tests for each story marked [P] can run in parallel
- Phase 7 lint and typecheck can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test turborepo independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Turborepo works!
3. Add US2 → Test independently → Package structure works!
4. Add US3 → Test independently → DSL features work! (MVP!)
5. Add US4 → References updated
6. Polish → Ready for publishing

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Turborepo)
   - Developer B: US2 (Package)
3. Then:
   - Developer A: US3 (Features)
   - Developer B: US4 (References)
4. Both complete → Polish together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD per Constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Summary

- **Total Tasks**: 53
- **Completed**: 17 (Phase 1-3)
- **Remaining**: 36
  - Phase 4 (US2): 8 tasks (2 tests + 5 implementation + 1 verify)
  - Phase 5 (US3): 17 tasks (6 tests + 10 implementation + 1 verify)
  - Phase 6 (US4): 4 tasks
  - Phase 7: 7 tasks
- **Parallel Opportunities**: 15 tasks marked [P]
- **Test Tasks**: 8 (T018-T019, T026-T031)
- **Implementation Tasks**: 28
