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

- [ ] T006 Create `packages/kitsugi/package.json` with name "kitsugi", version "0.1.0", and proper scripts
- [ ] T007 [P] Create `packages/kitsugi/tsconfig.json` with strict TypeScript configuration
- [ ] T008 [P] Create `packages/kitsugi/tsconfig.build.json` for build-specific TypeScript config
- [ ] T009 Create `packages/kitsugi/src/index.ts` with minimal exports structure
- [ ] T010 Create `packages/kitsugi/tests/index.test.ts` with basic test to verify TDD setup works
- [ ] T011 Verify `turbo run build` successfully builds the kitsugi package

---

## Phase 3: User Story 1 - Set up Turborepo Structure (Priority: P1) 🎯 MVP

**Goal**: Repository configured as turborepo with valid build pipeline

**Independent Test**: Run `turbo run build` at root and verify all packages build successfully

### Tests for User Story 1

> NOTE: Write tests FIRST, ensure they FAIL before implementation

- [ ] T012 [P] [US1] Add contract test for turbo.json validity in tests/contract/test_turbo_config.test.ts
- [ ] T013 [P] [US1] Add contract test for workspace linking in tests/contract/test_workspace.test.ts

### Implementation for User Story 1

- [ ] T014 [US1] Verify turbo.json has correct $schema and pipeline definitions
- [ ] T015 [US1] Verify package.json workspaces includes "packages/*"
- [ ] T016 [US1] Run `turbo run build` and confirm all packages build without errors
- [ ] T017 [US1] Run `turbo run test` and confirm all tests pass

**Checkpoint**: Turborepo infrastructure working - can proceed to library implementation

---

## Phase 4: User Story 2 - Create TypeScript Library Package (Priority: P1)

**Goal**: Library package created with proper TypeScript configuration and build output

**Independent Test**: Package builds independently and can be imported by other packages

### Tests for User Story 2

> NOTE: Write tests FIRST, ensure they FAIL before implementation

- [ ] T018 [P] [US2] Add test for package.json exports in tests/contract/test_package_exports.test.ts
- [ ] T019 [P] [US2] Add test for TypeScript declaration files in tests/contract/test_types.test.ts

### Implementation for User Story 2

- [ ] T020 [US2] Configure package.json exports field for ESM compatibility
- [ ] T021 [US2] Add build script to generate dist/ output with .d.ts files
- [ ] T022 [US2] Run `turbo run build --filter=kitsugi` and verify dist/ contains compiled JS and types
- [ ] T023 [US2] Verify package can be imported via `import { ... } from 'kitsugi'`

**Checkpoint**: Library package structure complete - ready for DSL implementation

---

## Phase 5: User Story 3 - Implement Library Features (Priority: P2)

**Goal**: TypeScript library provides declarative modpack management DSL functionality

**Independent Test**: Tests pass and library produces recipe output compatible with Go executor

### Tests for User Story 3

> NOTE: Write tests FIRST (TDD), ensure they FAIL before implementation

- [ ] T024 [P] [US3] Add unit test for Mod entity in tests/unit/Mod.test.ts
- [ ] T025 [P] [US3] Add unit test for ModPack entity in tests/unit/ModPack.test.ts
- [ ] T026 [P] [US3] Add unit test for Source entity in tests/unit/Source.test.ts
- [ ] T027 [US3] Add unit test for Recipe output format in tests/unit/Recipe.test.ts
- [ ] T028 [US3] Add integration test for DSL builder in tests/integration/dsl_builder.test.ts

### Implementation for User Story 3

- [ ] T029 [US3] Create Mod entity in src/entities/Mod.ts
- [ ] T030 [US3] Create ModPack entity in src/entities/ModPack.ts
- [ ] T031 [US3] Create Source entity in src/entities/Source.ts
- [ ] T032 [US3] Create Builder class in src/builder/Builder.ts for fluent DSL
- [ ] T033 [US3] Create Recipe output generator in src/output/RecipeGenerator.ts
- [ ] T034 [US3] Create main export file src/index.ts with public API
- [ ] T035 [US3] Run tests and verify all pass (Red-Green-Refactor)
- [ ] T036 [US3] Build package and verify recipe JSON output is generated correctly

**Checkpoint**: Library features implemented and tested - ready for publishing

---

## Phase 6: User Story 4 - Migrate Existing Code References (Priority: P3)

**Goal**: Update any references to old library location to use new kitsugi package

**Independent Test**: All imports work and functionality runs correctly

### Implementation for User Story 4

- [ ] T037 [US4] Check docs/ for any references to TypeScript library imports
- [ ] T038 [US4] Update any outdated import paths in documentation

**Checkpoint**: References updated - library ready for use

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and publication preparation

- [ ] T039 [P] Run linting across all packages with `turbo run lint`
- [ ] T040 [P] Run type checking with `turbo run typecheck`
- [ ] T041 Create CHANGELOG.md for kitsugi package
- [ ] T042 Add repository badges and links in package.json (repository, homepage, bugs)
- [ ] T043 Verify npm publish will work (run `npm publish --dry-run`)

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

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Core entities before services
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- US1 and US2 can run in parallel (both P1)
- Tests for each story marked [P] can run in parallel

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
