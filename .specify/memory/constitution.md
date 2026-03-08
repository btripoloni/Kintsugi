# Project Constitution

## Core Principles

### I. Code Readability (NON-NEGOTIABLE)
Code MUST be readable and easy to understand. Code is read far more often than it is written. Every developer MUST be able to understand the purpose, logic, and flow of any piece of code without extensive explanation. This includes: meaningful variable and function names, clear structure, appropriate comments for complex logic, and consistent formatting.

### II. Test-Driven Development (NON-NEGOTIABLE)
TDD is MANDATORY for all new features and bug fixes. The workflow is: write failing test first → verify test fails → implement code → verify test passes → refactor. Red-Green-Refactor cycle MUST be strictly followed. No feature is complete until tests pass and demonstrate the expected behavior.

### III. Quality Tools with Caution
External libraries and tools that improve product quality MAY be used, but with caution. Before adding any dependency, evaluate: necessity (can it be solved with existing tools?), maintenance status (is it actively maintained?), security (known vulnerabilities?), and impact (how does it affect bundle size/performance?). Prefer minimal, focused libraries over heavy frameworks. All dependencies MUST be documented and periodically reviewed.

### IV. Self-Documenting Code
Code SHOULD be self-documenting through clear naming, structure, and intent. Additional comments are only necessary when explaining WHY (not WHAT) the code does something non-obvious. Complex algorithms or business rules that cannot be made clear through code structure require documentation. Generated documentation MUST reflect actual code behavior.

### V. Simplicity and YAGNI
Start simple. Implement only what is needed now, not what might be needed later. Avoid over-engineering or building flexible abstractions prematurely. Complexity MUST be justified by concrete requirements, not hypothetical future needs. When in doubt, prefer the simpler solution.

## Quality Standards

All code MUST meet these standards before being considered complete:
- All tests pass (unit, integration, contract as applicable)
- Code passes linting and formatting checks
- No security vulnerabilities in dependencies
- Documentation reflects actual implementation
- Code follows project style conventions

## Governance

This constitution supersedes all other development practices. Amendments require:
1. Documentation of proposed change and rationale
2. Review and approval from maintainers
3. Migration plan if changes affect existing code
4. Update to constitution version

All PRs and code reviews MUST verify compliance with these principles. Complexity deviations MUST be justified in writing and approved before implementation.

**Version**: 1.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08
