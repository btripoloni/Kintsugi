package commands

import (
	"fmt"

	"kintsugi/internal/cli"
	"kintsugi/internal/store"

	"github.com/spf13/cobra"
)

var gcCmd = &cobra.Command{
	Use:   "gc",
	Short: "Garbage collect unused derivations and recipes",
	Long:  `Identify and remove derivations that are not used by any active modpack, and recipes that are no longer referenced.`,
	Run:   runGC,
}

func init() {
	gcCmd.Flags().Bool("dry-run", false, "Simulate garbage collection without deleting files")
}

func runGC(cmd *cobra.Command, args []string) {
	dryRun, _ := cmd.Flags().GetBool("dry-run")

	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	s, err := store.NewStore(config.RootDir)
	if err != nil {
		cli.Die("Failed to initialize store: %v", err)
	}
	defer s.Close()

	fmt.Println("Running garbage collection...")
	results, err := s.GarbageCollect(cmd.Context(), dryRun)
	if err != nil {
		cli.Die("Garbage collection failed: %v", err)
	}

	// Print results
	if len(results.DeletedDerivations) > 0 {
		fmt.Printf("Deleted Derivations (%d):\n", len(results.DeletedDerivations))
		for _, hash := range results.DeletedDerivations {
			fmt.Printf(" - %s\n", hash)
		}
	} else {
		fmt.Println("No unused derivations found.")
	}

	if len(results.DeletedRecipes) > 0 {
		fmt.Printf("Deleted Recipes (%d):\n", len(results.DeletedRecipes))
		for _, hash := range results.DeletedRecipes {
			fmt.Printf(" - %s\n", hash)
		}
	} else {
		fmt.Println("No orphaned recipes found.")
	}

	if len(results.Errors) > 0 {
		fmt.Printf("Errors encountered (%d):\n", len(results.Errors))
		for _, err := range results.Errors {
			fmt.Printf(" - %v\n", err)
		}
	}

	if dryRun {
		fmt.Println("\nDry run completed. No files were deleted.")
	} else {
		fmt.Println("\nGarbage collection completed.")
	}
}
