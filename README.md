# Kintsugi

A declarative, reproducible, and isolated modpack manager for games, heavily inspired by [Nix](https://nixos.org/).

## What is Kintsugi?

Kintsugi is a tool that allows you to create and manage game modpacks declaratively. Instead of manually installing mods and dealing with conflicts, you describe the desired final state of your modpack in TypeScript code, and Kintsugi takes care of building a reproducible and isolated installation.

### Key Features

- **Declarative**: Describe the desired final state of your modpack, and Kintsugi achieves that state automatically
- **Reproducible**: Anyone, on any machine, with the same recipe, will produce an identical installation
- **Isolated**: Each build is self-contained and immutable, allowing multiple versions and instant rollbacks
- **TypeScript**: Define your modpacks using a familiar and powerful language
- **Dependency Management**: The system automatically resolves dependencies between mods and tools

## Installation

### Prerequisites

- Go 1.25 or higher
- Deno (for the interpreter)
- `fuse-overlayfs` (for modpack execution)

### Using Nix

If you have Nix installed with flakes enabled:

```bash
# Install Kintsugi
nix profile install github:btripoloni/kintsugi#kintsugi

# Install Kintsugi Compiler
nix profile install github:btripoloni/kintsugi#kintsugi-compiler
```

### Building from Source

```bash
git clone https://github.com/btripoloni/kintsugi.git
cd kintsugi

# Build Kintsugi
go build -o kintsugi ./cmd/kintsugi

# Build Kintsugi Compiler
go build -o kintsugi-compiler ./cmd/kintsugi-compiler
```

## Quick Start

1. **Create a new modpack:**
   ```bash
   kintsugi init my-modpack
   cd my-modpack
   ```

2. **Edit the modpack:**
   Open `main.ts` and define your mods using the Kintsugi API:
   ```typescript
   import { mkShard, mkComposition, sources, writeRunSpec } from "kintsugi/mod.ts";
   
   const game = await mkShard({
     name: "my-game",
     version: "1.0.0",
     src: sources.fetch_local({ path: "/path/to/game" }),
   });
   
   export default await mkComposition({
     name: "my-modpack",
     layers: [
       game,
       await writeRunSpec({
         name: "default",
         entrypoint: "game.exe",
       }),
     ],
   });
   ```

3. **Build the modpack:**
   ```bash
   kintsugi build
   ```

4. **Run the modpack:**
   ```bash
   kintsugi run my-modpack
   ```

## Documentation

- **[Getting Started Guide](docs/getting-started.md)** - Get started with Kintsugi in minutes
- **[Fundamental Concepts](docs/concepts.md)** - Understand the concepts behind Kintsugi
- **[Complete Usage Guide](docs/usage.md)** - Complete reference of commands and features

## Main Commands

- `kintsugi init <name>` - Create a new modpack
- `kintsugi build` - Build the current modpack
- `kintsugi run <name> [profile]` - Run a modpack
- `kintsugi modpack list` - List all registered modpacks
- `kintsugi modpack generations <name>` - List generations of a modpack
- `kintsugi modpack rollback <name> <generation>` - Rollback to a previous generation
- `kintsugi gc` - Remove unused builds from the store

## How It Works?

Kintsugi works in three steps:

1. **Interpretation**: The Deno interpreter executes your `main.ts` file and generates JSON "recipes" that describe how to build each component of the modpack.

2. **Compilation**: The compiler reads the recipes, downloads sources, executes scripts, and assembles the final structure in the Kintsugi Store (`~/.kintsugi/store/`).

3. **Execution**: When you run a modpack, Kintsugi mounts the build using OverlayFS, allowing the game to save files while keeping the original build immutable.

## Contributing

Contributions are welcome! Open issues to report bugs or request features, and send pull requests to contribute code.

## License

This project is licensed under the [MIT License](./LICENSE).
