// Package compiler provides the build system for Kintsugi derivations.
// It handles dependency resolution, fetching sources, and building derivations.
package compiler

import (
	"fmt"
	"os"

	"kintsugi/internal/recipe"
	"kintsugi/internal/store"
)

// Compiler handles the building of derivations.
type Compiler struct {
	store       *store.Store
	modpackPath string // Path to modpack directory for resolving relative paths
}

// New creates a new Compiler instance.
func New(s *store.Store) *Compiler {
	return &Compiler{
		store: s,
	}
}

// SetModpackPath sets the modpack path for resolving relative paths in fetch_local.
func (c *Compiler) SetModpackPath(path string) {
	c.modpackPath = path
}

// BuildResult contains the result of a build operation.
type BuildResult struct {
	StorePath string
	Cached    bool
}

// BuildAll builds all derivations in dependency order starting from rootHash.
// It returns the number of derivations built and any error encountered.
func (c *Compiler) BuildAll(rootHash string) (int, error) {
	// 1. Build dependency graph
	buildOrder, err := c.resolveDependencies(rootHash)
	if err != nil {
		return 0, fmt.Errorf("dependency resolution failed: %w", err)
	}

	fmt.Printf("Build Plan (%d steps):\n", len(buildOrder))
	for i, drv := range buildOrder {
		fmt.Printf("%d. %s (%s)\n", i+1, drv.Out, drv.Src.Type())
	}

	// 2. Execute builds
	for i, drv := range buildOrder {
		fmt.Printf("[%d/%d] Building %s (%s)...\n", i+1, len(buildOrder), drv.Out, drv.Src.Type())

		if err := c.buildDerivation(drv); err != nil {
			return i, fmt.Errorf("build failed for %s: %w", drv.Out, err)
		}
	}

	return len(buildOrder), nil
}

// BuildDerivation builds a single derivation.
// Returns BuildResult indicating if it was cached or newly built.
func (c *Compiler) BuildDerivation(drv *recipe.Derivation) (*BuildResult, error) {
	storePath := c.store.GetDerivationPath(
		extractRecipeHash(drv.Out),
		extractName(drv.Out),
		extractVersion(drv.Out),
	)

	// Check if already exists (caching)
	if _, err := os.Stat(storePath); err == nil {
		return &BuildResult{StorePath: storePath, Cached: true}, nil
	}

	if err := c.buildDerivation(drv); err != nil {
		return nil, err
	}

	return &BuildResult{StorePath: storePath, Cached: false}, nil
}

func (c *Compiler) buildDerivation(drv *recipe.Derivation) error {
	storePath := c.store.GetDerivationPath(
		extractRecipeHash(drv.Out),
		extractName(drv.Out),
		extractVersion(drv.Out),
	)

	// Check if already exists (simple caching)
	if _, err := os.Stat(storePath); err == nil {
		fmt.Printf("  -> Cached at %s\n", storePath)
		return nil
	}

	var buildErr error
	switch f := drv.Src.(type) {
	case *recipe.FetchLocal:
		buildErr = c.buildLocal(f, storePath)
	case *recipe.FetchBuild:
		buildErr = c.buildComposite(f, storePath)
	case *recipe.FetchUrl:
		buildErr = c.buildURL(f, storePath)
	case *recipe.FetchVase:
		buildErr = c.buildVase(f, storePath)
	case *recipe.WriteText:
		buildErr = c.buildWriteText(f, storePath)
	case *recipe.WriteJson:
		buildErr = c.buildWriteJson(f, storePath)
	case *recipe.WriteToml:
		buildErr = c.buildWriteToml(f, storePath)
	case *recipe.FetchGit:
		buildErr = c.buildGit(f, storePath)
	case *recipe.RunInBuild:
		buildErr = c.buildRunInBuild(f, storePath)
	case *recipe.BlankSource:
		buildErr = c.buildBlankSource(storePath)
	default:
		return fmt.Errorf("unknown fetcher type: %s", drv.Src.Type())
	}

	if buildErr != nil {
		return buildErr
	}

	// Execute postbuild script after successful build
	return runPostbuild(drv.Postbuild, storePath)
}

// resolveDependencies builds the dependency graph and returns derivations in build order.
func (c *Compiler) resolveDependencies(rootHash string) ([]*recipe.Derivation, error) {
	visited := make(map[string]bool)
	var order []*recipe.Derivation

	var visit func(hash string) error
	visit = func(hash string) error {
		if visited[hash] {
			return nil
		}

		drv, err := c.store.LoadDerivation(hash)
		if err != nil {
			return err
		}

		// Visit regular dependencies
		for _, depHash := range drv.Dependencies {
			if err := visit(depHash); err != nil {
				return err
			}
		}

		// Visit layers for FetchBuild
		if fb, ok := drv.Src.(*recipe.FetchBuild); ok {
			for _, layerHash := range fb.Layers {
				if err := visit(layerHash); err != nil {
					return err
				}
			}
		}

		// Visit build dependency for RunInBuild
		if rib, ok := drv.Src.(*recipe.RunInBuild); ok {
			if err := visit(rib.Build); err != nil {
				return err
			}
		}

		visited[hash] = true
		order = append(order, drv)
		return nil
	}

	if err := visit(rootHash); err != nil {
		return nil, err
	}

	return order, nil
}

// Helper functions for extracting parts from derivation output name
// Format: [hash]-[name]-[version]

func extractRecipeHash(out string) string {
	parts := splitDerivationName(out)
	if len(parts) >= 1 {
		return parts[0]
	}
	return ""
}

func extractName(out string) string {
	parts := splitDerivationName(out)
	if len(parts) >= 2 {
		return parts[1]
	}
	return ""
}

func extractVersion(out string) string {
	parts := splitDerivationName(out)
	if len(parts) >= 3 {
		return parts[2]
	}
	return ""
}

func splitDerivationName(out string) []string {
	// The format is hash-name-version
	// But hash is 32 chars, so we need to be careful
	if len(out) < 34 { // minimum: 32 char hash + "-" + 1 char name
		return nil
	}

	// Find the first dash after position 32 (hash length)
	idx := 32
	if idx < len(out) && out[idx] == '-' {
		remaining := out[idx+1:]
		// Now split remaining by "-" to get name and version
		parts := []string{out[:idx]}
		nameVer := splitNameVersion(remaining)
		parts = append(parts, nameVer...)
		return parts
	}

	return nil
}

func splitNameVersion(s string) []string {
	// Find the last "-" which separates name from version
	lastDash := -1
	for i := len(s) - 1; i >= 0; i-- {
		if s[i] == '-' {
			lastDash = i
			break
		}
	}
	if lastDash == -1 {
		return []string{s, ""}
	}
	return []string{s[:lastDash], s[lastDash+1:]}
}

// runPostbuild executes a postbuild script in the given directory.
func runPostbuild(script string, dir string) error {
	return runScript(script, dir, "postbuild")
}
