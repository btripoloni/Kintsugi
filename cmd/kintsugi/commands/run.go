package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"kintsugi/internal/recipe"
	"kintsugi/internal/store"

	"github.com/spf13/cobra"
)

var RunCmd = &cobra.Command{
	Use:   "run <modpack_name> [nome]",
	Short: "Run the active build of a modpack",
	Args:  cobra.RangeArgs(1, 2),
	Run: func(cmd *cobra.Command, args []string) {
		modpackName := args[0]
		runName := "default"
		if len(args) > 1 {
			runName = args[1]
		}

		home, _ := os.UserHomeDir()

		s, err := store.NewStore(filepath.Join(home, ".kintsugi"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to open store: %v\n", err)
			os.Exit(1)
		}
		defer s.Close()

		// Resolve the build path through "current build" symlink
		modpackDir := filepath.Join(s.ModpacksPath(), modpackName)
		currentLink := filepath.Join(modpackDir, "current build")
		prefixDir := filepath.Join(modpackDir, "wine-prefix")

		// Read "current build" symlink -> "[hash]-[name]-gen-N"
		target, err := os.Readlink(currentLink)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: modpack '%s' has no active build. Try running 'kintsugi build' first.\n", modpackName)
			os.Exit(1)
		}

		// Resolve the gen symlink to get the store path
		genLink := filepath.Join(modpackDir, target)
		storePath, err := os.Readlink(genLink)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: failed to resolve gen symlink: %v\n", err)
			os.Exit(1)
		}

		// Get the hash from the store path for environment variables
		hash := filepath.Base(storePath)

		// Locate the .run.json file
		runJsonPath := filepath.Join(storePath, "kintsugi", "exec", fmt.Sprintf("%s.run.json", runName))
		if _, err := os.Stat(runJsonPath); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Error: run spec '%s' not found at %s\n", runName, runJsonPath)
			fmt.Fprintf(os.Stderr, "Available run specs should be in: %s\n", filepath.Join(storePath, "kintsugi", "exec"))
			os.Exit(1)
		}

		// Read and parse the .run.json file
		data, err := os.ReadFile(runJsonPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: failed to read run spec: %v\n", err)
			os.Exit(1)
		}

		var runSpec recipe.RunSpec
		if err := json.Unmarshal(data, &runSpec); err != nil {
			fmt.Fprintf(os.Stderr, "Error: failed to parse run spec JSON: %v\n", err)
			os.Exit(1)
		}

		if runSpec.Entrypoint == "" {
			fmt.Fprintf(os.Stderr, "Error: run spec '%s' has no entrypoint defined\n", runName)
			os.Exit(1)
		}

		fmt.Printf("Running modpack '%s' with spec '%s'...\n", modpackName, runName)

		// Build the command
		var runCmd *exec.Cmd
		entrypointPath := filepath.Join(storePath, runSpec.Entrypoint)

		if runSpec.Umu != nil {
			// Execute via UMU
			umuArgs := []string{
				//"run",
				//"--umu-version", runSpec.Umu.Version,
				//"--umu-appid", runSpec.Umu.ID,
				entrypointPath,
			}
			umuArgs = append(umuArgs, runSpec.Args...)
			runCmd = exec.Command("umu-run", umuArgs...)
		} else {
			// Execute natively
			runCmd = exec.Command(entrypointPath, runSpec.Args...)
		}

		runCmd.Dir = storePath
		runCmd.Stdout = os.Stdout
		runCmd.Stderr = os.Stderr
		runCmd.Stdin = os.Stdin

		// Set environment variables
		env := os.Environ()
		env = append(env, fmt.Sprintf("KINTSUGI_ROOT=%s", storePath))
		env = append(env, fmt.Sprintf("KINTSUGI_MODPACK_NAME=%s", modpackName))
		env = append(env, fmt.Sprintf("KINTSUGI_BUILD_HASH=%s", hash))
		env = append(env, fmt.Sprintf("WINEPREFIX=%s", prefixDir))

		// Add environment variables from RunSpec
		for key, value := range runSpec.Env {
			env = append(env, fmt.Sprintf("%s=%s", key, value))
		}

		runCmd.Env = env

		// Check if umu-run is available when needed
		if runSpec.Umu != nil {
			if _, err := exec.LookPath("umu-run"); err != nil {
				fmt.Fprintf(os.Stderr, "Error: umu-run not found in PATH. Please install UMU-Launcher.\n")
				os.Exit(1)
			}
		}

		if err := runCmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Execution failed: %v\n", err)
			os.Exit(1)
		}
	},
}
