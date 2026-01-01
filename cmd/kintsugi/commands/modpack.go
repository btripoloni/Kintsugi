package commands

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

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
	Run: func(cmd *cobra.Command, args []string) {
		home, _ := os.UserHomeDir()
		modpacksDir := filepath.Join(home, ".kintsugi", "modpacks")

		entries, err := os.ReadDir(modpacksDir)
		if err != nil {
			if os.IsNotExist(err) {
				fmt.Println("No modpacks found.")
				return
			}
			fmt.Fprintf(os.Stderr, "Error reading modpacks: %v\n", err)
			os.Exit(1)
		}

		if len(entries) == 0 {
			fmt.Println("No modpacks found.")
			return
		}

		fmt.Println("Registered modpacks:")
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}

			modpackDir := filepath.Join(modpacksDir, entry.Name())
			currentLink := filepath.Join(modpackDir, "current build")

			status := "no active build"
			if target, err := os.Readlink(currentLink); err == nil {
				status = fmt.Sprintf("active: %s", target)
			}

			fmt.Printf("  • %s (%s)\n", entry.Name(), status)
		}
	},
}

var generationsCmd = &cobra.Command{
	Use:   "generations [name]",
	Short: "List all generations of a modpack",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		home, _ := os.UserHomeDir()
		modpackDir := filepath.Join(home, ".kintsugi", "modpacks", name)

		if _, err := os.Stat(modpackDir); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Modpack '%s' not found\n", name)
			os.Exit(1)
		}

		entries, err := os.ReadDir(modpackDir)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading modpack: %v\n", err)
			os.Exit(1)
		}

		// Get current active generation
		currentLink := filepath.Join(modpackDir, "current build")
		currentGen, _ := os.Readlink(currentLink)

		// Find all generation symlinks
		type generation struct {
			name   string
			num    int
			target string
		}
		var gens []generation

		for _, entry := range entries {
			if entry.Name() == "current build" {
				continue
			}

			// Check if it's a symlink
			linkPath := filepath.Join(modpackDir, entry.Name())
			if target, err := os.Readlink(linkPath); err == nil {
				// Extract generation number from name
				// Format: [hash]-[name]-gen-[N]
				parts := strings.Split(entry.Name(), "-gen-")
				if len(parts) == 2 {
					if num, err := strconv.Atoi(parts[1]); err == nil {
						gens = append(gens, generation{
							name:   entry.Name(),
							num:    num,
							target: filepath.Base(target),
						})
					}
				}
			}
		}

		if len(gens) == 0 {
			fmt.Printf("No generations found for '%s'\n", name)
			return
		}

		// Sort by generation number (newest first)
		sort.Slice(gens, func(i, j int) bool {
			return gens[i].num > gens[j].num
		})

		fmt.Printf("Generations for '%s':\n", name)
		for _, g := range gens {
			marker := "  "
			if g.name == currentGen {
				marker = "* "
			}
			fmt.Printf("%s[%d] %s -> %s\n", marker, g.num, g.name, g.target)
		}
		fmt.Println("\n* = current active build")
	},
}

var rollbackCmd = &cobra.Command{
	Use:   "rollback [name] [generation]",
	Short: "Rollback to a specific generation",
	Long:  "Rollback to a specific generation number. Use 'generations' to see available generations.",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		genNum, err := strconv.Atoi(args[1])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Invalid generation number: %s\n", args[1])
			os.Exit(1)
		}

		home, _ := os.UserHomeDir()
		modpackDir := filepath.Join(home, ".kintsugi", "modpacks", name)

		if _, err := os.Stat(modpackDir); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Modpack '%s' not found\n", name)
			os.Exit(1)
		}

		// Find the generation symlink
		entries, err := os.ReadDir(modpackDir)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading modpack: %v\n", err)
			os.Exit(1)
		}

		var targetGen string
		for _, entry := range entries {
			if strings.Contains(entry.Name(), fmt.Sprintf("-gen-%d", genNum)) {
				// Verify it ends with the exact number
				parts := strings.Split(entry.Name(), "-gen-")
				if len(parts) == 2 {
					if num, err := strconv.Atoi(parts[1]); err == nil && num == genNum {
						targetGen = entry.Name()
						break
					}
				}
			}
		}

		if targetGen == "" {
			fmt.Fprintf(os.Stderr, "Generation %d not found for '%s'\n", genNum, name)
			os.Exit(1)
		}

		// Update "current build" symlink
		currentLink := filepath.Join(modpackDir, "current build")
		os.Remove(currentLink)
		if err := os.Symlink(targetGen, currentLink); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to rollback: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Rolled back '%s' to generation %d (%s)\n", name, genNum, targetGen)
	},
}

var deleteCmd = &cobra.Command{
	Use:   "delete [name]",
	Short: "Delete a modpack registration",
	Long:  "Removes the modpack from ~/.kintsugi/modpacks. Does not delete builds from store (use 'gc' for that).",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		home, _ := os.UserHomeDir()
		modpackDir := filepath.Join(home, ".kintsugi", "modpacks", name)

		if _, err := os.Stat(modpackDir); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Modpack '%s' not found\n", name)
			os.Exit(1)
		}

		if err := os.RemoveAll(modpackDir); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to delete modpack: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Deleted modpack '%s'\n", name)
		fmt.Println("Note: Build artifacts remain in store. Run 'kintsugi gc' to clean up.")
	},
}

// shows the current build path via command line
var pathCmd = &cobra.Command{
	Use:   "path [name]",
	Short: "Show the current build path for a modpack",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		home, _ := os.UserHomeDir()
		modpackDir := filepath.Join(home, ".kintsugi", "modpacks", name)

		if _, err := os.Stat(modpackDir); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Modpack '%s' not found\n", name)
			os.Exit(1)
		}

		currentLink := filepath.Join(modpackDir, "current build")
		if target, err := os.Readlink(currentLink); err == nil {
			//show the path to the current build + the modpack directory
			fmt.Println(filepath.Join(modpackDir, target))
			return
		}

		fmt.Fprintf(os.Stderr, "Failed to read current build path for '%s'\n", name)
		os.Exit(1)
	},
}

func init() {
	ModpackCmd.AddCommand(listCmd)
	ModpackCmd.AddCommand(generationsCmd)
	ModpackCmd.AddCommand(rollbackCmd)
	ModpackCmd.AddCommand(deleteCmd)
	ModpackCmd.AddCommand(pathCmd)
}
