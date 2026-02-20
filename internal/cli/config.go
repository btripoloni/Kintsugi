// Package cli provides common utilities for Kintsugi CLI commands.
package cli

import (
	"fmt"
	"os"
	"path/filepath"
)

const (
	// DefaultKintsugiDir is the default directory name for Kintsugi data.
	DefaultKintsugiDir = ".kintsugi"

	// DefaultStoreDir is the default subdirectory for the store.
	DefaultStoreDir = "store"

	// DefaultRecipesDir is the default subdirectory for recipes.
	DefaultRecipesDir = "recipes"

	// DefaultModpacksDir is the default subdirectory for modpacks.
	DefaultModpacksDir = "modpacks"

	// DefaultVasesDir is the default subdirectory for vases.
	DefaultVasesDir = "vases"
)

// Config holds common configuration for CLI commands.
type Config struct {
	// RootDir is the root directory for Kintsugi data (default: ~/.kintsugi).
	RootDir string

	// ModpackPath is the path to the current modpack directory.
	ModpackPath string
}

// NewConfig creates a new Config with defaults.
func NewConfig() (*Config, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get user home directory: %w", err)
	}

	return &Config{
		RootDir: filepath.Join(home, DefaultKintsugiDir),
	}, nil
}

// StorePath returns the path to the store directory.
func (c *Config) StorePath() string {
	return filepath.Join(c.RootDir, DefaultStoreDir)
}

// RecipesPath returns the path to the recipes directory.
func (c *Config) RecipesPath() string {
	return filepath.Join(c.RootDir, DefaultRecipesDir)
}

// ModpacksPath returns the path to the modpacks directory.
func (c *Config) ModpacksPath() string {
	return filepath.Join(c.RootDir, DefaultModpacksDir)
}

// VasesPath returns the path to the vases directory.
func (c *Config) VasesPath() string {
	return filepath.Join(c.RootDir, DefaultVasesDir)
}

// GetModpackPath returns the path to a specific modpack.
func (c *Config) GetModpackPath(name string) string {
	return filepath.Join(c.ModpacksPath(), name)
}

// GetCurrentBuildLink returns the path to the "current build" symlink for a modpack.
func (c *Config) GetCurrentBuildLink(modpackName string) string {
	return filepath.Join(c.GetModpackPath(modpackName), "current build")
}

// ResolveCurrentBuild resolves the current build for a modpack.
// It returns the generation name and the store path.
func (c *Config) ResolveCurrentBuild(modpackName string) (genName string, storePath string, err error) {
	modpackDir := c.GetModpackPath(modpackName)
	currentLink := filepath.Join(modpackDir, "current build")

	// Read "current build" symlink -> "[hash]-[name]-gen-N"
	target, err := os.Readlink(currentLink)
	if err != nil {
		return "", "", fmt.Errorf("modpack '%s' has no active build", modpackName)
	}

	// Resolve the gen symlink to get the store path
	genLink := filepath.Join(modpackDir, target)
	storePath, err = os.Readlink(genLink)
	if err != nil {
		return "", "", fmt.Errorf("failed to resolve gen symlink: %w", err)
	}

	return target, storePath, nil
}

// Die prints an error message and exits with code 1.
func Die(format string, args ...interface{}) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}

// DieIfError prints an error message and exits if err is not nil.
func DieIfError(err error, format string, args ...interface{}) {
	if err != nil {
		if format != "" {
			fmt.Fprintf(os.Stderr, format+": %v\n", append(args, err)...)
		} else {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		}
		os.Exit(1)
	}
}
