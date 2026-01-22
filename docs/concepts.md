# Fundamental Concepts

This document explains the fundamental concepts of Kintsugi that you need to understand to use the tool effectively.

## Architecture Overview

Kintsugi works in three main steps:

1. **Interpretation**: Your `main.ts` file (written in TypeScript) is executed by the Deno interpreter, which generates JSON "recipes"
2. **Compilation**: The compiler reads the recipes and builds the Shards in the Store
3. **Execution**: When you run a modpack, Kintsugi mounts the build using OverlayFS

## Shards

**Shards** are the fundamental units of Kintsugi. A Shard is a recipe that describes how to produce a set of files in the Store.

### Shard Characteristics

- **Deterministic**: The same Shard always produces the same result
- **Hash-Identified**: Each Shard has a unique hash based on its inputs (name, version, source, dependencies, etc.)
- **Stored in Store**: Once built, a Shard resides in `~/.kintsugi/store/[hash]-[name]-[version]`
- **Immutable**: Once in the Store, a Shard cannot be modified

### Shard Structure

```typescript
const myShard = await mkShard({
    name: "shard-name",
    version: "1.0.0",
    src: sources.fetch_url({ ... }), // Content source
    dependencies: [otherShard], // Dependencies
    postBuild: "echo 'Post-build script'", // Optional script
    permissions: ["network"], // Required permissions
});
```

## Sources

**Sources** are mechanisms to obtain or generate content for a Shard. Kintsugi provides several source functions:

- **`fetch_url`**: Downloads files from a URL
- **`fetch_local`**: Copies files from the local filesystem
- **`fetch_vase`**: Imports from a Vase (global collection of assets)
- **`write_text`**: Generates a text file
- **`write_json`**: Generates a JSON file
- **`run_in_build`**: Executes a tool and captures the output

See the [Sources Library](sources-library.md) for complete details.

## Compositions

A **Composition** (`mkComposition`) combines multiple Shards into layers to form the final modpack.

### Layer Order

The order of Shards in `layers` is important! Later Shards **overwrite** files from earlier Shards. This allows:

- Adding mods on top of the base game
- Applying patches on top of existing mods
- Customizing configurations

```typescript
export default await mkComposition({
    name: "my-modpack",
    layers: [
        baseGame,      // Layer 1: Base game
        mod1,          // Layer 2: Mod 1 (overwrites game files if needed)
        mod2,          // Layer 3: Mod 2 (overwrites game and mod1 files)
        configuration, // Layer 4: Custom configurations
    ],
});
```

## Dependencies

Shards can declare dependencies on other Shards. Kintsugi resolves these dependencies automatically:

- **Build Order**: Dependencies are built before the Shard that requires them
- **Access During Build**: Dependencies are available during `postBuild` execution
- **Recursive Resolution**: Dependencies of dependencies are resolved automatically

```typescript
const game = await mkShard({ ... });
const mod = await mkShard({
    dependencies: [game], // The mod depends on the game
    postBuild: `
        # The game directory is available here
        cp game/file.txt .
    `,
});
```

## Store

The **Store** (`~/.kintsugi/store/`) is where all builds are stored. Each built Shard resides in a directory named `[hash]-[name]-[version]`.

### Store Characteristics

- **Immutable**: Once in the Store, a Shard cannot be modified
- **Deduplication**: Identical Shards share the same directory
- **Garbage Collection**: Use `kintsugi gc` to remove unused Shards

## Generations

Each time you run `kintsugi build`, a new **generation** is created. Generations allow:

- **History**: Keep a history of all builds
- **Rollback**: Instantly revert to a previous version
- **Testing**: Test new versions without losing the current version

### Managing Generations

```bash
# List all generations
kintsugi modpack generations my-modpack

# Rollback to a previous generation
kintsugi modpack rollback my-modpack 3
```

## Run Specs

**Run Specs** (execution specifications) define how to run a modpack. They are created using `writeRunSpec` and specify:

- **Entrypoint**: The executable to launch
- **Arguments**: Command-line arguments
- **Environment Variables**: Additional environment variables
- **UMU/Wine**: Configuration for execution via Proton/Wine (optional)

```typescript
await writeRunSpec({
    name: "default",
    entrypoint: "game.exe",
    args: ["--mode", "fullscreen"],
    env: {
        MY_VAR: "value",
    },
    umu: {
        version: "GE-Proton9-4",
        id: "489830", // Steam AppID
    },
});
```

You can have multiple Run Specs (different profiles):

```typescript
layers: [
    game,
    await writeRunSpec({ name: "default", entrypoint: "game.exe" }),
    await writeRunSpec({ name: "editor", entrypoint: "editor.exe" }),
]
```

Run different profiles with:
```bash
kintsugi run my-modpack default
kintsugi run my-modpack editor
```

## OverlayFS and Execution

When you run a modpack with `kintsugi run`, Kintsugi:

1. Mounts the build from the Store using **OverlayFS** (or `fuse-overlayfs`)
2. Creates an upper layer where the game can save files
3. Exposes a unified view where the immutable build is the base and changes are in the upper layer

This allows:
- **Immutability**: The original build is never modified
- **Persistence**: The game can save files normally
- **Isolation**: Each execution can have its own upper layer

## Vases

**Vases** are global collections of large, immutable assets (such as base game files). They are stored outside the main Store for efficiency.

Use Vases to:
- Share large assets between multiple modpacks
- Avoid data duplication
- Manage base game versions

```typescript
const game = await mkShard({
    src: sources.fetch_vase({ vase: "skyrim-se-1.6.117" }),
});
```

## Garbage Collection

The `kintsugi gc` command removes Shards and recipes that are no longer referenced by any active modpack.

```bash
# Simulate (doesn't delete anything)
kintsugi gc --dry-run

# Run garbage collection
kintsugi gc
```

This helps free up disk space by removing old builds that are no longer needed.
