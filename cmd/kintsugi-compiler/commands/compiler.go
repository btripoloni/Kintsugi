// Package commands contains the CLI commands for kintsugi-compiler.
package commands

import (
	"fmt"
	"os"

	"kintsugi/internal/cli"
	"kintsugi/internal/compiler"
	"kintsugi/internal/store"
)

// Execute runs the compiler with the given arguments.
func Execute() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: kintsugi-compiler <root-recipe-hash>")
		os.Exit(1)
	}

	rootHash := os.Args[1]

	// Initialize configuration
	config, err := cli.NewConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize config: %v\n", err)
		os.Exit(1)
	}

	// Initialize store
	s, err := store.NewStore(config.RootDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to open store: %v\n", err)
		os.Exit(1)
	}
	defer s.Close()

	// Initialize compiler
	c := compiler.New(s)

	// Set modpack path from environment if available
	if modpackPath := os.Getenv("KINTSUGI_MODPACK_PATH"); modpackPath != "" {
		c.SetModpackPath(modpackPath)
	}

	fmt.Printf("Compiler processing root hash: %s\n", rootHash)

	// Build all derivations
	count, err := c.BuildAll(rootHash)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Build failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("All %d derivations built successfully.\n", count)
}
