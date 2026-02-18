# Kintsugi Constitution

<!-- Sync Impact Report (2026-02-17):
  - Version: 0.0.0 → 1.0.0 (NEW - Initial Constitution)
  - This is the first version of the constitution based on user requirements:
    * Go CLI application
    * Focus on code quality and readability
    * Intuitive user experience
    * Test-driven development (TDD)
  - Templates requiring updates: None (first version)
  - Deferred items: None
-->

## Core Principles

### I. Code Quality

Code must be written with clarity and maintainability as primary goals. Every function, type, and variable MUST have a clear, descriptive name that reveals intent. Code MUST be self-documenting; comments explaining "what" are forbidden—comments should only explain "why" when intent is non-obvious. Complex logic MUST be decomposed into smaller, testable units. Static analysis tools (linters, formatters) MUST pass without exceptions.

### II. Intuitive User Experience

The CLI MUST be designed with the end user in mind. Command structure MUST follow industry conventions and be self-explanatory. Every command MUST provide helpful error messages that guide users toward resolution. The system MUST offer contextual help via `--help` flags. Feedback MUST be immediate and actionable. Onboarding via `kintsugi init` and documentation MUST enable users to succeed without external assistance.

### III. Test-First (TDD - NON-NEGOTIABLE)

Test-driven development is MANDATORY. The workflow is strict: write a failing test first → verify failure → implement the minimal code to pass → refactor. This Red-Green-Refactor cycle MUST be followed for every feature. Tests MUST be written before implementation. Test coverage MUST remain high; new code without tests is not acceptable. Integration tests MUST verify end-to-end behavior for critical user workflows.

### IV. CLI-First Interface

The command-line interface is the primary interaction model. Commands MUST be consistent in structure: `kintsugi <noun> <verb>` pattern. Flags and arguments MUST follow POSIX conventions. Output MUST be human-readable by default, with machine-parseable formats (JSON) available via flags. The CLI MUST handle errors gracefully, returning appropriate exit codes.

### V. Simplicity

Follow YAGNI (You Aren't Gonna Need It) and the principle of least surprise. Start with the simplest solution that works; add complexity only when justified by concrete requirements. Avoid premature abstraction. Every feature MUST justify its existence through user value.

## Technology Stack

The project uses Go for the CLI implementation, TypeScript for defining modpack recipes, and Deno as the interpreter runtime. All Go code MUST be formatted with `gofmt` and pass static analysis via `golangci-lint`. TypeScript code MUST follow Deno's linting rules and use the standard formatter. Dependencies MUST be kept minimal and pinned to specific versions.

## Development Workflow

All contributions MUST follow the TDD workflow. Code changes MUST include corresponding tests that pass before merging. Pull requests MUST be reviewed by at least one maintainer. The CI pipeline MUST run all tests and linting checks before allowing merges. Breaking changes MUST be documented and include migration guidance.

## Governance

This constitution supersedes all other development practices. Amendments require:
1. A proposal documenting the change and rationale
2. Review and approval from maintainers
3. An implementation plan if migration is needed
4. Update to this document with version bump

**Version**: 1.0.0 | **Ratified**: 2026-02-17 | **Last Amended**: 2026-02-17
