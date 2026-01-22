# Complete Usage Guide

This guide covers all commands and features of Kintsugi.

## Main Commands

### `kintsugi init <name>`

Creates a new modpack in the current directory.

```bash
kintsugi init my-modpack
cd my-modpack
```

This creates:
- `modpack.json` - Modpack metadata
- `deno.json` - Deno configuration
- `main.ts` - Main modpack file

### `kintsugi build`

Builds the current modpack. Must be run inside the modpack directory.

```bash
cd my-modpack
kintsugi build
```

The build process:
1. Executes the Deno interpreter on `main.ts`
2. Generates JSON recipes in `~/.kintsugi/recipes/`
3. Executes the compiler to build Shards in the Store
4. Registers the build as the active generation of the modpack

### `kintsugi run <name> [profile]`

Runs a modpack. The profile is optional and defaults to `"default"`.

```bash
# Run with default profile
kintsugi run my-modpack

# Run with specific profile
kintsugi run my-modpack editor
```

Kintsugi:
1. Mounts the build using OverlayFS
2. Executes the executable specified in the Run Spec
3. Unmounts automatically when the game closes

## Modpack Management

### `kintsugi modpack list`

Lists all registered modpacks and their status.

```bash
kintsugi modpack list
```

Example output:
```
Registered modpacks:
  • my-modpack (active: abc123-my-modpack-gen-1)
  • other-modpack (no active build)
```

### `kintsugi modpack generations <name>`

Lists all generations (builds) of a modpack.

```bash
kintsugi modpack generations my-modpack
```

Example output:
```
Generations for 'my-modpack':
* [3] abc123-my-modpack-gen-3 -> def456-my-modpack-1.0.0
  [2] xyz789-my-modpack-gen-2 -> ghi012-my-modpack-1.0.0
  [1] mno345-my-modpack-gen-1 -> pqr678-my-modpack-1.0.0

* = current active build
```

### `kintsugi modpack rollback <name> <generation>`

Rolls back to a previous generation.

```bash
kintsugi modpack rollback my-modpack 2
```

This updates the "current build" link to point to the specified generation.

### `kintsugi modpack delete <name>`

Removes a modpack registration. **Does not delete builds from the Store**.

```bash
kintsugi modpack delete my-modpack
```

To remove builds from the Store, use `kintsugi gc` afterwards.

### `kintsugi modpack path <name>`

Shows the path of the active build for a modpack.

```bash
kintsugi modpack path my-modpack
```

## Garbage Collection

### `kintsugi gc [--dry-run]`

Removes unused Shards and recipes from the Store.

```bash
# Simulate (doesn't delete anything)
kintsugi gc --dry-run

# Run garbage collection
kintsugi gc
```

The garbage collector:
- Identifies Shards that are not referenced by any active modpack
- Removes orphaned recipes
- Frees up disk space

## Vase Management

### `kintsugi vase list`

Lists all registered Vases.

```bash
kintsugi vase list
```

### `kintsugi vase add <name> <path>`

Registers a new Vase.

```bash
kintsugi vase add skyrim-se-1.6.117 /path/to/skyrim
```

### `kintsugi vase remove <name>`

Removes a Vase from the registry.

```bash
kintsugi vase remove skyrim-se-1.6.117
```

## Directory Structure

Kintsugi creates the following structure in `~/.kintsugi/`:

```
~/.kintsugi/
├── store/              # Built Shards
│   └── [hash]-[name]-[version]/
├── recipes/            # Generated JSON recipes
│   └── [hash]-[name]-[version].json
├── modpacks/           # Modpack registrations
│   └── [name]/
│       ├── current build -> [hash]-[name]-gen-[N]
│       ├── [hash]-[name]-gen-1 -> ~/.kintsugi/store/...
│       ├── [hash]-[name]-gen-2 -> ~/.kintsugi/store/...
│       ├── upperlayer/ # OverlayFS upper layer
│       ├── worklayer/ # OverlayFS work layer
│       └── mountlayer/ # OverlayFS mount point
└── vases/              # Registered Vases (if any)
```

## Environment Variables

When you run a modpack, Kintsugi sets the following environment variables:

- `KINTSUGI_ROOT` - Path to the build in the Store
- `KINTSUGI_MODPACK_NAME` - Modpack name
- `KINTSUGI_BUILD_HASH` - Current build hash
- `WINEPREFIX` - Path to Wine prefix (if applicable)

You can use these variables in `postBuild` scripts or in Run Specs.

## Usage Examples

### Create a Modpack with Multiple Mods

```typescript
import { mkShard, mkComposition, sources, writeRunSpec } from "kintsugi/mod.ts";

const game = await mkShard({
    name: "skyrim-se",
    version: "1.6.117",
    src: sources.fetch_vase({ vase: "skyrim-se-1.6.117" }),
});

const skse = await mkShard({
    name: "skse",
    version: "2.6.5",
    src: sources.fetch_url({
        url: "https://skse.silverlock.org/beta/skse64_2_06_05.7z",
        sha256: "...",
        unpack: true,
    }),
    dependencies: [game],
});

const mod1 = await mkShard({
    name: "mod1",
    version: "1.0.0",
    src: sources.fetch_url({
        url: "https://example.com/mod1.zip",
        sha256: "...",
        unpack: true,
    }),
    dependencies: [game],
});

export default await mkComposition({
    name: "my-modpack",
    layers: [
        game,
        skse,
        mod1,
        await writeRunSpec({
            name: "default",
            entrypoint: "skse64_loader.exe",
            umu: {
                version: "GE-Proton9-4",
                id: "489830",
            },
        }),
    ],
});
```

### Create a Modpack with Custom Configuration

```typescript
const config = await mkShard({
    name: "config",
    version: "1.0.0",
    src: sources.write_json({
        path: "Skyrim.ini",
        content: {
            General: {
                sLanguage: "ENGLISH",
                uGridsToLoad: 5,
            },
        },
    }),
});

export default await mkComposition({
    name: "my-modpack",
    layers: [
        game,
        config,
        await writeRunSpec({
            name: "default",
            entrypoint: "SkyrimSE.exe",
        }),
    ],
});
```

### Use Local Mods

```typescript
const localMod = await mkShard({
    name: "my-local-mod",
    version: "1.0.0",
    src: sources.fetch_local({
        path: "./mods/my-mod",
        exclude: ["*.tmp", "*.bak"],
    }),
    dependencies: [game],
});
```

## Tips and Best Practices

1. **Always specify SHA256 hashes** for URL downloads to ensure integrity
2. **Use Vases for large base games** to avoid duplication
3. **Declare dependencies explicitly** to ensure correct build order
4. **Use `postBuild` for cleanup** and file organization after download
5. **Keep old generations** for easy rollback
6. **Run `gc` periodically** to free up space
7. **Use multiple Run Specs** for different execution modes (game, editor, testing)

## Troubleshooting

### Build fails with dependency error

Check that all dependencies are declared correctly and that dependent Shards have been built.

### Execution fails with mount error

Make sure `fuse-overlayfs` is installed and that you have appropriate permissions.

### Modpack doesn't appear in `modpack list`

Make sure you've run `kintsugi build` at least once in the modpack directory.

### Incorrect SHA256 hash

Use `sha256sum` (Linux) to verify the correct hash of the file.
