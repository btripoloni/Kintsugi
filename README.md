# Kintsugi

A declarative, reproducible, and isolated modpack manager for games, heavily inspired by [Nix](https://nixos.org/).

## Features

- **Declarative:** Describe the desired final state of your modpack, and Kintsugi takes care of achieving it.
- **Reproducible:** Anyone, on any machine, with the same recipe, will produce an identical installation.
- **Isolated:** Each build is self-contained and immutable, allowing multiple versions and instant rollbacks.

## Installation

Currently, there is no pre-built installation method available. You can install Kintsugi using Nix or by compiling from source.

### Prerequisites

- Go 1.25 or higher
- Deno (for the interpreter)

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

## Basic Usage

```bash
kintsugi --help
```

For more details, see the [full documentation](./docs/).

## Contributing

Contributions are welcome! Open issues to report bugs or request features, and pull requests to contribute code.

## License

This project is licensed under the [MIT License](./LICENSE).