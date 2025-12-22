package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"kintsugi/internal/store"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "kintsugi",
	Short: "Declarative Mod Manager",
}

var initCmd = &cobra.Command{
	Use:   "init [name]",
	Short: "Initialize a new modpack",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		home, err := os.UserHomeDir()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting home directory: %v\n", err)
			os.Exit(1)
		}

		modpackDir := filepath.Join(home, ".kintsugi", "modpacks", name)
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

		// Hardcoded dev path for imports
		devImportPath := "file:///home/tripoloni/Projects/mod-manager/interpreter/mod.ts"

		// Create main.ts
		mainTs := fmt.Sprintf(`import { mkLocal, mkUrl, mkBuild } from "%s";

// Define your modpack here
const game = await mkLocal("game", "1.0.0", "/path/to/game");

export default mkBuild({
    name: "%s",
    layers: [game],
    // version: "0.0.1"
});
`, devImportPath, name)
		if err := os.WriteFile(filepath.Join(modpackDir, "main.ts"), []byte(mainTs), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing main.ts: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Initialized modpack '%s' in %s\n", name, modpackDir)
	},
}

var buildCmd = &cobra.Command{
	Use:   "build",
	Short: "Build the current modpack",
	Run: func(cmd *cobra.Command, args []string) {
		cwd, err := os.Getwd()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting CWD: %v\n", err)
			os.Exit(1)
		}

		// Check for main.ts
		mainTsPath := filepath.Join(cwd, "main.ts")
		if _, err := os.Stat(mainTsPath); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "main.ts not found in %s\n", cwd)
			os.Exit(1)
		}

		fmt.Println("Building modpack...")

		home, _ := os.UserHomeDir()
		interpreterPath := filepath.Join(home, "Projects/mod-manager/interpreter/mod.ts")

		denoCmd := exec.Command("deno", "run", "--allow-read", "--allow-write", "--allow-env", interpreterPath, cwd)
		output, err := denoCmd.Output()
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				fmt.Fprintf(os.Stderr, "Interpreter failed: %v\nStderr: %s\n", err, exitErr.Stderr)
			} else {
				fmt.Fprintf(os.Stderr, "Interpreter failed: %v\n", err)
			}
			os.Exit(1)
		}

		rootHash := strings.TrimSpace(string(output))
		fmt.Printf("Interpreter success. Root Hash: %s\n", rootHash)

		// Locate compiler
		projectRoot := filepath.Dir(filepath.Dir(interpreterPath))
		compilerBinPath := filepath.Join(projectRoot, "bin", "kintsugi-compiler")

		fmt.Printf("Running compiler: %s %s\n", compilerBinPath, rootHash)
		compilerCmd := exec.Command(compilerBinPath, rootHash)
		compilerCmd.Stdout = os.Stdout
		compilerCmd.Stderr = os.Stderr
		compilerCmd.Env = os.Environ()

		if err := compilerCmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Compiler failed: %v\n", err)
			os.Exit(1)
		}

		fmt.Println("Build complete.")

		// Update active modpack in DB
		// Read name from modpack.json
		modpackJsonPath := filepath.Join(cwd, "modpack.json")
		data, err := os.ReadFile(modpackJsonPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to read modpack.json: %v\n", err)
			return // Don't exit, build was successful
		}

		var mpMeta struct {
			Name string `json:"name"`
		}
		if err := json.Unmarshal(data, &mpMeta); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to parse modpack.json: %v\n", err)
			return
		}

		s, err := store.NewStore(filepath.Join(home, ".kintsugi"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to open store: %v\n", err)
			return
		}
		defer s.Close()

		if err := s.UpdateModpack(context.Background(), mpMeta.Name, rootHash); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to update active modpack: %v\n", err)
		} else {
			fmt.Printf("Updated active build for '%s'\n", mpMeta.Name)
		}
	},
}

var runCmd = &cobra.Command{
	Use:   "run <modpack_name>",
	Short: "Run the active build of a modpack",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		home, _ := os.UserHomeDir()

		s, err := store.NewStore(filepath.Join(home, ".kintsugi"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to open store: %v\n", err)
			os.Exit(1)
		}
		defer s.Close() // In run command we might want to keep it open? No.

		ctx := context.Background()
		hash, err := s.GetActiveModpack(ctx, name)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\nTry running 'kintsugi build' first.\n", err)
			os.Exit(1)
		}

		drv, err := s.LoadDerivation(hash)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to load derivation %s: %v\n", hash, err)
			os.Exit(1)
		}

		runScript := drv.Src.Run
		if runScript == "" {
			// If no run script, check entrypoint?
			// runScript = drv.Src.Entrypoint
		}

		if runScript == "" {
			fmt.Println("No 'run' script defined for this modpack.")
			return
		}

		// Calculate store path
		storePath := filepath.Join(s.StorePath(), drv.Out)

		fmt.Printf("Running modpack '%s'...\n", name)

		// Execute
		runCmd := exec.Command("sh", "-c", runScript)
		runCmd.Dir = storePath // Run inside the build directory
		runCmd.Stdout = os.Stdout
		runCmd.Stderr = os.Stderr
		runCmd.Stdin = os.Stdin

		// Set environment variables
		env := os.Environ()
		env = append(env, fmt.Sprintf("KINTSUGI_ROOT=%s", storePath))
		runCmd.Env = env

		if err := runCmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Execution failed: %v\n", err)
			os.Exit(1)
		}
	},
}

func main() {
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(buildCmd)
	rootCmd.AddCommand(runCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
