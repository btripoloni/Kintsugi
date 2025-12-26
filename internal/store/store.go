package store

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
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
	dirs := []string{"store", "recipes", "modpacks", "vases"}
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

func (s *Store) VasesPath() string {
	return filepath.Join(s.RootDir, "vases")
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

// AddVase copies the content of srcPath to the vases directory with a versioned name.
func (s *Store) AddVase(name, srcPath string) (string, error) {
	// Find the next incremental number for this name
	entries, err := os.ReadDir(s.VasesPath())
	if err != nil {
		return "", err
	}

	maxGen := 0
	prefix := name + "-"
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), prefix) {
			suffix := entry.Name()[len(prefix):]
			if num, err := strconv.Atoi(suffix); err == nil {
				if num > maxGen {
					maxGen = num
				}
			}
		}
	}

	vaseName := fmt.Sprintf("%s-%d", name, maxGen+1)
	destPath := filepath.Join(s.VasesPath(), vaseName)

	info, err := os.Stat(srcPath)
	if err != nil {
		return "", fmt.Errorf("source path not found: %w", err)
	}

	if info.IsDir() {
		if err := copyDir(srcPath, destPath); err != nil {
			return "", fmt.Errorf("failed to copy directory: %w", err)
		}
	} else {
		if err := os.MkdirAll(destPath, 0755); err != nil {
			return "", err
		}
		if err := copyFile(srcPath, filepath.Join(destPath, filepath.Base(srcPath))); err != nil {
			return "", fmt.Errorf("failed to copy file: %w", err)
		}
	}

	return vaseName, nil
}

// RemoveVase removes a vase by name if it's not being used by any derivation.
func (s *Store) RemoveVase(name string) error {
	inUse, err := s.IsVaseInUse(name)
	if err != nil {
		return err
	}
	if inUse {
		return fmt.Errorf("vase '%s' is in use and cannot be removed", name)
	}

	vasePath := filepath.Join(s.VasesPath(), name)
	return os.RemoveAll(vasePath)
}

// ListVases returns a list of all existing vases.
func (s *Store) ListVases() ([]string, error) {
	entries, err := os.ReadDir(s.VasesPath())
	if err != nil {
		return nil, err
	}

	var vases []string
	for _, entry := range entries {
		if entry.IsDir() {
			vases = append(vases, entry.Name())
		}
	}
	return vases, nil
}

// IsVaseInUse checks if any recipe refers to the given vase.
func (s *Store) IsVaseInUse(name string) (bool, error) {
	entries, err := os.ReadDir(s.RecipesPath())
	if err != nil {
		return false, err
	}

	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		drv, err := s.LoadDerivation(strings.TrimSuffix(entry.Name(), ".json"))
		if err != nil {
			continue // Skip corrupted recipes
		}

		if drv.Src.Source == "vase" && drv.Src.Vase == name {
			return true, nil
		}
	}

	return false, nil
}

// Helper functions for copying (replicated from compiler to keep store independent)

func copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	srcInfo, err := srcFile.Stat()
	if err != nil {
		return err
	}

	dstFile, err := os.OpenFile(dst, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, srcInfo.Mode())
	if err != nil {
		return err
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	return err
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		destPath := filepath.Join(dst, rel)

		if info.IsDir() {
			return os.MkdirAll(destPath, info.Mode())
		}
		return copyFile(path, destPath)
	})
}
