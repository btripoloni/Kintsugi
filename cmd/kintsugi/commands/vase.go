package commands

import (
	"fmt"
	"os"
	"path/filepath"

	"kintsugi/internal/store"

	"github.com/spf13/cobra"
)

var VaseCmd = &cobra.Command{
	Use:   "vase",
	Short: "Manage vases (non-derivative files)",
}

var vaseAddCmd = &cobra.Command{
	Use:   "add [name] [path]",
	Short: "Add a new vase",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		srcPath := args[1]

		home, _ := os.UserHomeDir()
		s, err := store.NewStore(filepath.Join(home, ".kintsugi"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

		vaseName, err := s.AddVase(name, srcPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error adding vase: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Vase created: %s\n", vaseName)
	},
}

var vaseRemoveCmd = &cobra.Command{
	Use:   "remove [name]",
	Short: "Remove a vase",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]

		home, _ := os.UserHomeDir()
		s, err := store.NewStore(filepath.Join(home, ".kintsugi"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

		if err := s.RemoveVase(name); err != nil {
			fmt.Fprintf(os.Stderr, "Error removing vase: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Vase removed: %s\n", name)
	},
}

var vaseListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all vases",
	Run: func(cmd *cobra.Command, args []string) {
		home, _ := os.UserHomeDir()
		s, err := store.NewStore(filepath.Join(home, ".kintsugi"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}

		vases, err := s.ListVases()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error listing vases: %v\n", err)
			os.Exit(1)
		}

		if len(vases) == 0 {
			fmt.Println("No vases found.")
			return
		}

		fmt.Println("Existing vases:")
		for _, v := range vases {
			fmt.Printf("- %s\n", v)
		}
	},
}

func init() {
	VaseCmd.AddCommand(vaseAddCmd)
	VaseCmd.AddCommand(vaseRemoveCmd)
	VaseCmd.AddCommand(vaseListCmd)
}
