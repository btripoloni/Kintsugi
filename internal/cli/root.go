package cli

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

var (
	storePath string
	dbPath    string
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "modmanager",
	Short: "A declarative mod manager for Linux",
	Long: `ModManager is the core engine of the Mod Manager.
It executes build plans (JSON DAGs) to create isolated, reproducible modpacks using Linux technologies like OverlayFS and Namespaces.`,
	// Uncomment the following line if your bare application
	// has an action associated with it:
	// Run: func(cmd *cobra.Command, args []string) { },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	// Find home directory.
	home, err := os.UserHomeDir()
	if err != nil {
		// Fallback to current directory if home is not found (rare)
		home = "."
	}

	// XDG-like defaults for user space
	defaultStore := filepath.Join(home, ".local", "share", "modmanager", "store")
	defaultDB := filepath.Join(home, ".local", "share", "modmanager", "metadata.db")

	rootCmd.PersistentFlags().StringVar(&storePath, "store", defaultStore, "Path to the content-addressable store")
	rootCmd.PersistentFlags().StringVar(&dbPath, "db", defaultDB, "Path to the metadata database")
}
