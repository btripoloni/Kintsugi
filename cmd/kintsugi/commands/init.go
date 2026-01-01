package commands

import (
	"fmt"
	"kintsugi/internal/interpreter"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

var InitCmd = &cobra.Command{
	Use:   "init [name]",
	Short: "Initialize a new modpack",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		cwd, err := os.Getwd()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting current directory: %v\n", err)
			os.Exit(1)
		}

		// Create modpack directory in current location
		modpackDir := filepath.Join(cwd, name)
		if err := os.MkdirAll(modpackDir, 0755); err != nil {
			fmt.Fprintf(os.Stderr, "Error creating modpack directory: %v\n", err)
			os.Exit(1)
		}

		// Create modpack.json
		modpackJson := fmt.Sprintf(`{
	"name": "%s",
	"description": "A new modpack",
	"author": "You",
	"license": "MIT"
}`, name)
		if err := os.WriteFile(filepath.Join(modpackDir, "modpack.json"), []byte(modpackJson), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing modpack.json: %v\n", err)
			os.Exit(1)
		}

		// Create .kintsugi/types directory
		typesDir := filepath.Join(modpackDir, ".kintsugi", "types")
		if err := os.MkdirAll(typesDir, 0755); err != nil {
			fmt.Fprintf(os.Stderr, "Error creating types directory: %v\n", err)
			os.Exit(1)
		}

		// Inject embedded TypeScript files
		err = interpreter.ExtractAssets(interpreter.InterpreterAssets, typesDir)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error injecting types: %v\n", err)
			os.Exit(1)
		}

		// Create deno.json
		denoJson := `{
	"imports": {
		"kintsugi/": "./.kintsugi/types/"
	}
}`
		if err := os.WriteFile(filepath.Join(modpackDir, "deno.json"), []byte(denoJson), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing deno.json: %v\n", err)
			os.Exit(1)
		}

		// Create main.ts with kintsugi import
		mainTs := fmt.Sprintf(`import { mkLocal, mkUrl, mkBuild } from "kintsugi/mod.ts";

// Define your modpack here
const game = await mkLocal({
    name: "game",
    version: "1.0.0",
    path: "/path/to/game"
});

export default mkBuild({
    name: "%s",
    layers: [game],
    // version: "0.0.1"
});
`, name)
		if err := os.WriteFile(filepath.Join(modpackDir, "main.ts"), []byte(mainTs), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing main.ts: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Initialized modpack '%s' in %s\n", name, modpackDir)
		fmt.Println("\nNext steps:")
		fmt.Printf("  cd %s\n", name)
		fmt.Println("  # Edit main.ts to configure your modpack")
		fmt.Println("  kintsugi build")
	},
}
