package commands

import (
	"fmt"

	"kintsugi/internal/cli"

	"github.com/spf13/cobra"
)

var ModpackCmd = &cobra.Command{
	Use:   "modpack",
	Short: "Manage modpacks",
	Long:  "List, delete, view generations, and rollback modpacks",
}

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List all registered modpacks",
	Run:   runList,
}

var generationsCmd = &cobra.Command{
	Use:   "generations [name]",
	Short: "List all generations of a modpack",
	Args:  cobra.ExactArgs(1),
	Run:   runGenerations,
}

var rollbackCmd = &cobra.Command{
	Use:   "rollback [name] [generation]",
	Short: "Rollback to a specific generation",
	Long:  "Rollback to a specific generation number. Use 'generations' to see available generations.",
	Args:  cobra.ExactArgs(2),
	Run:   runRollback,
}

var deleteCmd = &cobra.Command{
	Use:   "delete [name]",
	Short: "Delete a modpack registration",
	Long:  "Removes the modpack from ~/.kintsugi/modpacks. Does not delete builds from store (use 'gc' for that).",
	Args:  cobra.ExactArgs(1),
	Run:   runDelete,
}

var pathCmd = &cobra.Command{
	Use:   "path [name]",
	Short: "Show the current build path for a modpack",
	Args:  cobra.ExactArgs(1),
	Run:   runPath,
}

func init() {
	ModpackCmd.AddCommand(listCmd)
	ModpackCmd.AddCommand(generationsCmd)
	ModpackCmd.AddCommand(rollbackCmd)
	ModpackCmd.AddCommand(deleteCmd)
	ModpackCmd.AddCommand(pathCmd)
}

func runList(cmd *cobra.Command, args []string) {
	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	mgr := cli.NewModpackManager(config)
	modpacks, err := mgr.List()
	if err != nil {
		cli.Die("Error reading modpacks: %v", err)
	}

	if len(modpacks) == 0 {
		fmt.Println("No modpacks found.")
		return
	}

	fmt.Println("Registered modpacks:")
	for _, name := range modpacks {
		status, _ := mgr.GetStatus(name)
		fmt.Printf("  • %s (%s)\n", name, status)
	}
}

func runGenerations(cmd *cobra.Command, args []string) {
	name := args[0]

	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	mgr := cli.NewModpackManager(config)
	generations, err := mgr.GetGenerations(name)
	if err != nil {
		cli.Die("Error reading modpack: %v", err)
	}

	if len(generations) == 0 {
		fmt.Printf("No generations found for '%s'\n", name)
		return
	}

	// Get current generation
	currentGen, _ := mgr.GetCurrentGeneration(name)

	fmt.Printf("Generations for '%s':\n", name)
	for _, g := range generations {
		marker := "  "
		if currentGen != nil && g.Name == currentGen.Name {
			marker = "* "
		}
		fmt.Printf("%s[%d] %s -> %s\n", marker, g.Number, g.Name, g.Target)
	}
	fmt.Println("\n* = current active build")
}

func runRollback(cmd *cobra.Command, args []string) {
	name := args[0]
	genNum := parseIntArg(args[1], "generation number")

	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	mgr := cli.NewModpackManager(config)
	if err := mgr.Rollback(name, genNum); err != nil {
		cli.Die("Failed to rollback: %v", err)
	}

	fmt.Printf("Rolled back '%s' to generation %d\n", name, genNum)
}

func runDelete(cmd *cobra.Command, args []string) {
	name := args[0]

	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	mgr := cli.NewModpackManager(config)
	if err := mgr.Delete(name); err != nil {
		cli.Die("Failed to delete modpack: %v", err)
	}

	fmt.Printf("Deleted modpack '%s'\n", name)
	fmt.Println("Note: Build artifacts remain in store. Run 'kintsugi gc' to clean up.")
}

func runPath(cmd *cobra.Command, args []string) {
	name := args[0]

	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	genName, _, err := config.ResolveCurrentBuild(name)
	if err != nil {
		cli.Die("Failed to read current build path: %v", err)
	}

	fmt.Println(config.GetModpackPath(name) + "/" + genName)
}

func parseIntArg(s, name string) int {
	var result int
	_, err := fmt.Sscanf(s, "%d", &result)
	if err != nil {
		cli.Die("Invalid %s: %s", name, s)
	}
	return result
}
