# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-18

### Added
- Initial release of kitsugi TypeScript library
- Mod entity with id, name, version, and source fields
- ModPack entity for managing collections of mods
- Source entity with types: json, local, url, vase
- Builder class with fluent DSL methods (.mod(), .modPack(), .build())
- RecipeGenerator for JSON output compatible with Go executor
- Source handlers: JsonSource, LocalSource, UrlSource, VaseSource

### Package
- Turborepo monorepo structure with workspace configuration
- ES Modules (ESM) output
- TypeScript declaration files (.d.ts) generated
- Published to npmjs.com as public package
