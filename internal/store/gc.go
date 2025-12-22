package store

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type GCResult struct {
	DeletedDerivations []string
	DeletedRecipes     []string
	Errors             []error
}

func (s *Store) GarbageCollect(ctx context.Context, dryRun bool) (*GCResult, error) {
	result := &GCResult{}

	// 1. Identify active roots (from modpacks)
	activeHashes, err := s.getActiveDerivations(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get active derivations: %w", err)
	}

	// 2. Build dependency graph and find all reachable derivations
	reachable := make(map[string]bool)
	for _, hash := range activeHashes {
		if err := s.markReachable(ctx, hash, reachable); err != nil {
			return nil, fmt.Errorf("failed to mark reachable from %s: %w", hash, err)
		}
	}

	// 3. Get all derivations from store directory
	allDerivations, err := s.getAllDerivations(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get all derivations: %w", err)
	}

	// 4. Identify garbage (All - Reachable)
	var garbageDerivations []string
	for _, hash := range allDerivations {
		if !reachable[hash] {
			garbageDerivations = append(garbageDerivations, hash)
		}
	}

	// 5. Cleanup Derivations
	for _, hash := range garbageDerivations {
		result.DeletedDerivations = append(result.DeletedDerivations, hash)
		if !dryRun {
			if err := s.deleteDerivation(ctx, hash); err != nil {
				result.Errors = append(result.Errors, fmt.Errorf("failed to delete derivation %s: %w", hash, err))
			}
		}
	}

	// 6. Cleanup Orphaned Recipes
	// A recipe is orphaned if no remaining derivations reference it.
	orphanedRecipes, err := s.getOrphanedRecipes(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to find orphaned recipes: %w", err)
	}

	for _, hash := range orphanedRecipes {
		result.DeletedRecipes = append(result.DeletedRecipes, hash)
		if !dryRun {
			if err := s.deleteRecipe(ctx, hash); err != nil {
				result.Errors = append(result.Errors, fmt.Errorf("failed to delete recipe %s: %w", hash, err))
			}
		}
	}

	return result, nil
}

// getActiveDerivations scans modpacks directory and returns hashes of active builds
func (s *Store) getActiveDerivations(ctx context.Context) ([]string, error) {
	modpacksDir := s.ModpacksPath()
	entries, err := os.ReadDir(modpacksDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var hashes []string
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		modpackDir := filepath.Join(modpacksDir, entry.Name())

		// Read "current build" symlink
		currentLink := filepath.Join(modpackDir, "current build")
		target, err := os.Readlink(currentLink)
		if err != nil {
			continue // No active build
		}

		// Resolve gen symlink to get store path
		genLink := filepath.Join(modpackDir, target)
		storePath, err := os.Readlink(genLink)
		if err != nil {
			continue
		}

		// The store path basename is the full derivation name (hash-name-version)
		// We use the full name as the hash identifier
		hash := filepath.Base(storePath)
		hashes = append(hashes, hash)
	}

	return hashes, nil
}

// markReachable recursively marks all derivations reachable from the given hash
func (s *Store) markReachable(ctx context.Context, hash string, visited map[string]bool) error {
	if visited[hash] {
		return nil
	}
	visited[hash] = true

	// Extract the recipe hash from the derivation name
	// Format: [hash]-[name]-[version] - we need the first part
	recipeHash := extractRecipeHash(hash)
	if recipeHash == "" {
		return nil
	}

	// Load the recipe to get dependencies
	drv, err := s.LoadDerivation(recipeHash)
	if err != nil {
		// Recipe might not exist (old derivation), just skip
		return nil
	}

	for _, dep := range drv.Dependencies {
		// Find the full derivation name for this dependency hash
		fullName := s.findDerivationByHash(dep)
		if fullName != "" {
			if err := s.markReachable(ctx, fullName, visited); err != nil {
				return err
			}
		}
	}
	return nil
}

// getAllDerivations returns all derivation names from the store directory
func (s *Store) getAllDerivations(ctx context.Context) ([]string, error) {
	storeDir := s.StorePath()
	entries, err := os.ReadDir(storeDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var names []string
	for _, entry := range entries {
		if entry.IsDir() {
			names = append(names, entry.Name())
		}
	}

	return names, nil
}

// deleteDerivation removes a derivation directory from the store
func (s *Store) deleteDerivation(ctx context.Context, name string) error {
	path := filepath.Join(s.StorePath(), name)

	// Check if path exists and remove it
	if _, err := os.Stat(path); err == nil {
		if err := os.RemoveAll(path); err != nil {
			return fmt.Errorf("failed to remove directory %s: %w", path, err)
		}
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("failed to stat directory %s: %w", path, err)
	}

	return nil
}

// getOrphanedRecipes finds recipes that are not referenced by any derivation in the store
func (s *Store) getOrphanedRecipes(ctx context.Context) ([]string, error) {
	// Get all recipe hashes
	recipesDir := s.RecipesPath()
	recipeEntries, err := os.ReadDir(recipesDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	// Get all derivation names to extract their recipe hashes
	derivations, err := s.getAllDerivations(ctx)
	if err != nil {
		return nil, err
	}

	// Build a set of used recipe hashes
	usedRecipes := make(map[string]bool)
	for _, drv := range derivations {
		recipeHash := extractRecipeHash(drv)
		if recipeHash != "" {
			usedRecipes[recipeHash] = true
		}
	}

	// Find orphaned recipes
	var orphaned []string
	for _, entry := range recipeEntries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		hash := strings.TrimSuffix(name, ".json")
		if !usedRecipes[hash] {
			orphaned = append(orphaned, hash)
		}
	}

	return orphaned, nil
}

// deleteRecipe removes a recipe file
func (s *Store) deleteRecipe(ctx context.Context, hash string) error {
	recipePath := filepath.Join(s.RecipesPath(), hash+".json")
	if _, err := os.Stat(recipePath); err == nil {
		if err := os.Remove(recipePath); err != nil {
			return fmt.Errorf("failed to remove recipe file %s: %w", recipePath, err)
		}
	}
	return nil
}

// extractRecipeHash extracts the hash from a derivation name
// Format: [hash]-[name]-[version] -> [hash]
func extractRecipeHash(derivationName string) string {
	// SHA256 hash is 64 characters
	if len(derivationName) < 64 {
		return ""
	}
	// Check if the first 64 chars look like a hash (hex chars)
	potentialHash := derivationName[:64]
	for _, c := range potentialHash {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return ""
		}
	}
	return potentialHash
}

// findDerivationByHash finds a derivation in the store that starts with the given hash
func (s *Store) findDerivationByHash(hash string) string {
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
