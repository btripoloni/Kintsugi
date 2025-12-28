package commands

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"kintsugi/internal/recipe"
	"kintsugi/internal/store"

	"github.com/spf13/cobra"
)

var RunCmd = &cobra.Command{
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

		var runScript string
		if fb, ok := drv.Src.(*recipe.FetchBuild); ok {
			runScript = fb.Entrypoint
		}

		if runScript == "" {
			fmt.Println("No 'run' or 'entrypoint' script defined for this modpack.")
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
