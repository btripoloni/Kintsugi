package store

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"kintsugi/internal/recipe"
)

func TestGarbageCollect(t *testing.T) {
	// Setup temporary store
	tmpDir, err := os.MkdirTemp("", "kintsugi-gc-test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	s, err := NewStore(tmpDir)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer s.Close()

	ctx := context.Background()

	// Helper to create valid derivation & recipe
	createDerivation := func(hash, name string, deps []string) {
		// Create recipe file with dependencies
		drv := recipe.Derivation{
			Out:          hash + "-" + name + "-v1",
			Dependencies: deps,
		}
		recipeData, _ := json.Marshal(drv)
		recipePath := filepath.Join(s.RecipesPath(), hash+".json")
		if err := os.WriteFile(recipePath, recipeData, 0644); err != nil {
			t.Fatalf("Failed to write recipe file: %v", err)
		}

		// Create derivation directory in store
		derivationPath := filepath.Join(s.StorePath(), hash+"-"+name+"-v1")
		if err := os.MkdirAll(derivationPath, 0755); err != nil {
			t.Fatalf("Failed to create derivation path: %v", err)
		}
	}

	// Helper to set active modpack via symlinks
	setActiveModpack := func(modpackName, hash, derivationName string) {
		modpackDir := filepath.Join(s.ModpacksPath(), modpackName)
		if err := os.MkdirAll(modpackDir, 0755); err != nil {
			t.Fatalf("Failed to create modpack dir: %v", err)
		}

		// Gen symlink name
		genLinkName := hash[:8] + "-" + modpackName + "-gen-1"

		// Create gen symlink pointing to store
		storePath := filepath.Join(s.StorePath(), derivationName)
		genLink := filepath.Join(modpackDir, genLinkName)
		if err := os.Symlink(storePath, genLink); err != nil {
			t.Fatalf("Failed to create gen symlink: %v", err)
		}

		// Create "current build" symlink pointing to gen link
		currentLink := filepath.Join(modpackDir, "current build")
		if err := os.Symlink(genLinkName, currentLink); err != nil {
			t.Fatalf("Failed to create current build symlink: %v", err)
		}
	}

	// Scenario:
	// A (Active) -> B
	// C (Unused)
	// E (Unused) -> F (Unused)

	// Create derivations with 64-char hashes
	hashB := "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	hashA := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	hashC := "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
	hashF := "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
	hashE := "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

	createDerivation(hashB, "depB", nil)
	createDerivation(hashA, "activeA", []string{hashB})
	createDerivation(hashC, "unusedC", nil)
	createDerivation(hashF, "unusedF", nil)
	createDerivation(hashE, "unusedE", []string{hashF})

	// Set A as active in a modpack
	setActiveModpack("testpack", hashA, hashA+"-activeA-v1")

	// Create an orphaned recipe (no derivation uses it)
	orphanedRecipeHash := "0000000000000000000000000000000000000000000000000000000000000000"
	orphanRecipePath := filepath.Join(s.RecipesPath(), orphanedRecipeHash+".json")
	if err := os.WriteFile(orphanRecipePath, []byte("{}"), 0644); err != nil {
		t.Fatalf("Failed to write orphan recipe file: %v", err)
	}

	// Verify initial state
	assertDerivationExists(t, s, hashA+"-activeA-v1", true)
	assertDerivationExists(t, s, hashB+"-depB-v1", true)
	assertDerivationExists(t, s, hashC+"-unusedC-v1", true)
	assertDerivationExists(t, s, hashE+"-unusedE-v1", true)
	assertDerivationExists(t, s, hashF+"-unusedF-v1", true)
	assertRecipeExists(t, s, orphanedRecipeHash, true)

	// Run GC
	result, err := s.GarbageCollect(ctx, false)
	if err != nil {
		t.Fatalf("GarbageCollect failed: %v", err)
	}

	// Verify Results
	assertDerivationExists(t, s, hashA+"-activeA-v1", true)  // Active
	assertDerivationExists(t, s, hashB+"-depB-v1", true)     // Dependency of Active
	assertDerivationExists(t, s, hashC+"-unusedC-v1", false) // Unused
	assertDerivationExists(t, s, hashE+"-unusedE-v1", false) // Unused
	assertDerivationExists(t, s, hashF+"-unusedF-v1", false) // Dependency of Unused (so also unused)
	assertRecipeExists(t, s, orphanedRecipeHash, false)      // Orphaned recipe

	// Check if recipes for deleted derivations are also deleted (since they become orphaned)
	assertRecipeExists(t, s, hashC, false)

	if len(result.DeletedDerivations) != 3 { // C, E, F
		t.Errorf("Expected 3 deleted derivations, got %d: %v", len(result.DeletedDerivations), result.DeletedDerivations)
	}
	if len(result.DeletedRecipes) != 4 { // C, E, F, orphanedRecipe
		t.Errorf("Expected 4 deleted recipes, got %d: %v", len(result.DeletedRecipes), result.DeletedRecipes)
	}
}

func assertDerivationExists(t *testing.T, s *Store, fullName string, expected bool) {
	t.Helper()
	path := filepath.Join(s.StorePath(), fullName)
	_, err := os.Stat(path)
	exists := err == nil

	if expected && !exists {
		t.Errorf("Derivation %s missing from store", fullName)
	}
	if !expected && exists {
		t.Errorf("Derivation %s should be deleted from store", fullName)
	}
}

func assertRecipeExists(t *testing.T, s *Store, hash string, expected bool) {
	t.Helper()
	path := filepath.Join(s.RecipesPath(), hash+".json")
	_, err := os.Stat(path)
	exists := err == nil

	if expected && !exists {
		t.Errorf("Recipe file %s missing", path)
	}
	if !expected && exists {
		t.Errorf("Recipe file %s should be deleted", path)
	}
}
