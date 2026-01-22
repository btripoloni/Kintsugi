# Getting Started Guide

This guide will help you create your first modpack with Kintsugi in just a few minutes.

## Prerequisites

Before you begin, make sure you have:

- Kintsugi and Kintsugi Compiler installed (see [README.md](../README.md))
- Deno installed (required for the interpreter)
- `fuse-overlayfs` installed (for modpack execution)

## Step 1: Create a New Modpack

Create a new modpack using the `init` command:

```bash
kintsugi init my-first-modpack
cd my-first-modpack
```

This will create a basic structure with the following files:

- `modpack.json` - Modpack metadata (name, description, author)
- `deno.json` - Deno configuration with Kintsugi imports
- `main.ts` - The main file where you define your modpack

## Step 2: Understand the Basic Structure

Open the generated `main.ts` file. It should look something like this:

```typescript
import { mkLocal, mkUrl, mkBuild } from "kintsugi/mod.ts";

// Define your modpack here
const game = await mkLocal({
    name: "game",
    version: "1.0.0",
    path: "/path/to/game"
});

export default mkBuild({
    name: "my-first-modpack",
    layers: [game],
});
```

### Main Components

- **`mkShard`**: Creates a "Shard", which is a unit of content (a mod, a patch, a configuration, etc.)
- **`mkComposition`**: Combines multiple Shards into layers to form the final modpack
- **`sources`**: Functions to obtain content (download from URL, copy locally, generate files, etc.)
- **`writeRunSpec`**: Defines how to run the modpack (which executable to run, arguments, etc.)

## Step 3: Create a Simple Modpack

Let's create a basic modpack that includes the game and an executable. Edit `main.ts`:

```typescript
import { mkShard, mkComposition, sources, writeRunSpec } from "kintsugi/mod.ts";

// The base game (adjust the path to your game)
const game = await mkShard({
    name: "my-game",
    version: "1.0.0",
    src: sources.fetch_local({
        path: "/path/to/your/game",
    }),
});

// The final modpack composition
export default await mkComposition({
    name: "my-first-modpack",
    layers: [
        game,
        // Define how to run the modpack
        await writeRunSpec({
            name: "default",
            entrypoint: "game.exe", // Adjust to your game's executable
        }),
    ],
});
```

## Step 4: Add a Mod

Let's add a mod downloaded from the internet:

```typescript
import { mkShard, mkComposition, sources, writeRunSpec } from "kintsugi/mod.ts";

const game = await mkShard({
    name: "my-game",
    version: "1.0.0",
    src: sources.fetch_local({
        path: "/path/to/your/game",
    }),
});

// A mod downloaded from the internet
const myMod = await mkShard({
    name: "my-mod",
    version: "1.0.0",
    src: sources.fetch_url({
        url: "https://example.com/mod.zip",
        sha256: "abc123...", // SHA256 hash of the file (required)
        unpack: true, // Automatically unpack
    }),
    dependencies: [game], // The mod depends on the game
});

export default await mkComposition({
    name: "my-first-modpack",
    layers: [
        game,
        myMod,
        await writeRunSpec({
            name: "default",
            entrypoint: "game.exe",
        }),
    ],
});
```

## Step 5: Build the Modpack

Run the build command:

```bash
kintsugi build
```

This command will:

1. Execute the Deno interpreter on `main.ts`
2. Generate JSON recipes for each Shard
3. Execute the compiler to build the Shards in the Store
4. Register the build as the active version of the modpack

If everything goes well, you'll see a success message and the build hash.

## Step 6: Run the Modpack

To run your modpack:

```bash
kintsugi run my-first-modpack
```

Or, if you want to specify a different execution profile:

```bash
kintsugi run my-first-modpack editor
```

## Next Steps

Now that you have the basics working, explore:

- **[Fundamental Concepts](concepts.md)** - Understand Shards, Sources, and other concepts
- **[Complete Usage Guide](usage.md)** - Learn about all commands and features
- **[Sources Library](sources-library.md)** - See all ways to obtain content
- **[Modpack Example](modpack-example.md)** - See a more complex example

## Tips

- **SHA256 Hashes**: To get the SHA256 hash of a file, use `sha256sum` (Linux) or `shasum -a 256` (macOS)
- **Layer Order**: The order of Shards in `layers` matters! Later Shards overwrite files from earlier Shards
- **Dependencies**: Always declare dependencies explicitly to ensure everything is built in the correct order
- **Generations**: Each build creates a new "generation". Use `kintsugi modpack generations <name>` to see all generations and `kintsugi modpack rollback <name> <generation>` to revert to a previous version

## Troubleshooting

### Error: "kintsugi-compiler not found in PATH"
Make sure `kintsugi-compiler` is installed and in your PATH.

### Error: "fuse-overlayfs: command not found"
Install `fuse-overlayfs`. On Linux, it's usually available in the default repositories.

### Error: "Deno not found"
Install Deno following the instructions at [deno.land](https://deno.land).

### Build fails with hash error
Check if the SHA256 hash you provided is correct. Use `sha256sum` to verify the hash of the downloaded file.
