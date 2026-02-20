package commands

import (
	"fmt"

	"kintsugi/internal/cli"
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
	Run:   runVaseAdd,
}

var vaseRemoveCmd = &cobra.Command{
	Use:   "remove [name]",
	Short: "Remove a vase",
	Args:  cobra.ExactArgs(1),
	Run:   runVaseRemove,
}

var vaseListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all vases",
	Run:   runVaseList,
}

func init() {
	VaseCmd.AddCommand(vaseAddCmd)
	VaseCmd.AddCommand(vaseRemoveCmd)
	VaseCmd.AddCommand(vaseListCmd)
}

func runVaseAdd(cmd *cobra.Command, args []string) {
	name := args[0]
	srcPath := args[1]

	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	s, err := store.NewStore(config.RootDir)
	if err != nil {
		cli.Die("Failed to initialize store: %v", err)
	}

	vaseName, err := s.AddVase(name, srcPath)
	if err != nil {
		cli.Die("Error adding vase: %v", err)
	}

	fmt.Printf("Vase created: %s\n", vaseName)
}

func runVaseRemove(cmd *cobra.Command, args []string) {
	name := args[0]

	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	s, err := store.NewStore(config.RootDir)
	if err != nil {
		cli.Die("Failed to initialize store: %v", err)
	}

	if err := s.RemoveVase(name); err != nil {
		cli.Die("Error removing vase: %v", err)
	}

	fmt.Printf("Vase removed: %s\n", name)
}

func runVaseList(cmd *cobra.Command, args []string) {
	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	s, err := store.NewStore(config.RootDir)
	if err != nil {
		cli.Die("Failed to initialize store: %v", err)
	}

	vases, err := s.ListVases()
	if err != nil {
		cli.Die("Error listing vases: %v", err)
	}

	if len(vases) == 0 {
		fmt.Println("No vases found.")
		return
	}

	fmt.Println("Existing vases:")
	for _, v := range vases {
		fmt.Printf("- %s\n", v)
	}
}
