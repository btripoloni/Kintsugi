package store

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"kintsugi/internal/recipe"
)

type Store struct {
	RootDir string
}

func NewStore(rootDir string) (*Store, error) {
	if err := os.MkdirAll(rootDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create root directory: %w", err)
	}

	s := &Store{RootDir: rootDir}

	// Ensure subdirectories
	dirs := []string{"store", "recipes", "modpacks"}
	for _, d := range dirs {
		if err := os.MkdirAll(filepath.Join(rootDir, d), 0755); err != nil {
			return nil, fmt.Errorf("failed to create subdir %s: %w", d, err)
		}
	}

	return s, nil
}

func (s *Store) StorePath() string {
	return filepath.Join(s.RootDir, "store")
}

func (s *Store) RecipesPath() string {
	return filepath.Join(s.RootDir, "recipes")
}

func (s *Store) ModpacksPath() string {
	return filepath.Join(s.RootDir, "modpacks")
}

func (s *Store) GetDerivationPath(hash, name, version string) string {
	// Format: [hash]-[name]-[version]
	dirName := fmt.Sprintf("%s-%s-%s", hash, name, version)
	return filepath.Join(s.StorePath(), dirName)
}

func (s *Store) LoadDerivation(hash string) (*recipe.Derivation, error) {
	recipePath := filepath.Join(s.RecipesPath(), hash+".json")
	f, err := os.Open(recipePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open recipe file %s: %w", recipePath, err)
	}
	defer f.Close()

	var drv recipe.Derivation
	if err := json.NewDecoder(f).Decode(&drv); err != nil {
		return nil, fmt.Errorf("failed to decode recipe %s: %w", hash, err)
	}
	return &drv, nil
}

func (s *Store) Close() error {
	// No-op: no database to close
	return nil
}

// GetActiveModpack returns the active build hash for a modpack by reading symlinks.
// It follows: modpacks/[name]/current build -> [hash]-[name]-gen-N -> store/[hash]
func (s *Store) GetActiveModpack(ctx context.Context, name string) (string, error) {
	modpackDir := filepath.Join(s.ModpacksPath(), name)
	currentLink := filepath.Join(modpackDir, "current build")

	// Read "current build" symlink -> "[hash]-[name]-gen-N"
	target, err := os.Readlink(currentLink)
	if err != nil {
		return "", fmt.Errorf("modpack '%s' has no active build", name)
	}

	// Resolve the gen symlink to get the store path
	genLink := filepath.Join(modpackDir, target)
	storePath, err := os.Readlink(genLink)
	if err != nil {
		return "", fmt.Errorf("failed to resolve gen symlink: %w", err)
	}

	// The store path is the full hash (basename of storePath)
	hash := filepath.Base(storePath)
	return hash, nil
}

// DerivationExists checks if a derivation exists in the store
func (s *Store) DerivationExists(hash string) bool {
	// Check if any directory in store starts with the hash
	entries, err := os.ReadDir(s.StorePath())
	if err != nil {
		return false
	}

	for _, entry := range entries {
		if entry.IsDir() && strings.HasPrefix(entry.Name(), hash) {
			return true
		}
	}
	return false
}

// RecipeExists checks if a recipe file exists
func (s *Store) RecipeExists(hash string) bool {
	recipePath := filepath.Join(s.RecipesPath(), hash+".json")
	_, err := os.Stat(recipePath)
	return err == nil
}

// FindDerivationByHash finds a derivation in the store that starts with the given hash
func (s *Store) FindDerivationByHash(hash string) string {
	entries, err := os.ReadDir(s.StorePath())
	if err != nil {
		return ""
	}

	for _, entry := range entries {
		if entry.IsDir() && strings.HasPrefix(entry.Name(), hash) {
			return entry.Name()
		}
	}
	return ""
}
