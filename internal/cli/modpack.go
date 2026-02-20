package cli

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// ModpackManager handles modpack registration and generation management.
type ModpackManager struct {
	config *Config
}

// NewModpackManager creates a new ModpackManager.
func NewModpackManager(config *Config) *ModpackManager {
	return &ModpackManager{config: config}
}

// Generation represents a modpack generation.
type Generation struct {
	Name   string // e.g., "hash-name-gen-5"
	Number int    // e.g., 5
	Target string // The store path this generation points to
}

// List returns all registered modpacks.
func (m *ModpackManager) List() ([]string, error) {
	modpacksDir := m.config.ModpacksPath()

	entries, err := os.ReadDir(modpacksDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var modpacks []string
	for _, entry := range entries {
		if entry.IsDir() {
			modpacks = append(modpacks, entry.Name())
		}
	}
	return modpacks, nil
}

// GetStatus returns the current build status for a modpack.
func (m *ModpackManager) GetStatus(name string) (string, error) {
	currentLink := m.config.GetCurrentBuildLink(name)
	target, err := os.Readlink(currentLink)
	if err != nil {
		return "no active build", nil
	}
	return fmt.Sprintf("active: %s", target), nil
}

// GetGenerations returns all generations for a modpack, sorted by number (newest first).
func (m *ModpackManager) GetGenerations(name string) ([]Generation, error) {
	modpackDir := m.config.GetModpackPath(name)

	entries, err := os.ReadDir(modpackDir)
	if err != nil {
		return nil, err
	}

	var generations []Generation
	for _, entry := range entries {
		if entry.Name() == "current build" {
			continue
		}

		linkPath := filepath.Join(modpackDir, entry.Name())
		target, err := os.Readlink(linkPath)
		if err != nil {
			continue
		}

		// Extract generation number from name
		// Format: [hash]-[name]-gen-[N]
		parts := strings.Split(entry.Name(), "-gen-")
		if len(parts) == 2 {
			if num, err := strconv.Atoi(parts[1]); err == nil {
				generations = append(generations, Generation{
					Name:   entry.Name(),
					Number: num,
					Target: filepath.Base(target),
				})
			}
		}
	}

	// Sort by generation number (newest first)
	sort.Slice(generations, func(i, j int) bool {
		return generations[i].Number > generations[j].Number
	})

	return generations, nil
}

// GetCurrentGeneration returns the current active generation for a modpack.
func (m *ModpackManager) GetCurrentGeneration(name string) (*Generation, error) {
	currentLink := m.config.GetCurrentBuildLink(name)
	genName, err := os.Readlink(currentLink)
	if err != nil {
		return nil, fmt.Errorf("no active build for modpack '%s'", name)
	}

	genLink := filepath.Join(m.config.GetModpackPath(name), genName)
	target, err := os.Readlink(genLink)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve generation symlink: %w", err)
	}

	// Extract generation number
	parts := strings.Split(genName, "-gen-")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid generation name format: %s", genName)
	}

	num, err := strconv.Atoi(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid generation number in: %s", genName)
	}

	return &Generation{
		Name:   genName,
		Number: num,
		Target: filepath.Base(target),
	}, nil
}

// RegisterBuild registers a new build for a modpack.
// It creates the necessary symlinks and increments the generation number.
func (m *ModpackManager) RegisterBuild(name, hash, storePath string) error {
	modpackDir := m.config.GetModpackPath(name)
	if err := os.MkdirAll(modpackDir, 0755); err != nil {
		return fmt.Errorf("failed to create modpack directory: %w", err)
	}

	// Find the next generation number
	generations, _ := m.GetGenerations(name)
	maxGen := 0
	for _, gen := range generations {
		if gen.Number > maxGen {
			maxGen = gen.Number
		}
	}

	nextGen := maxGen + 1
	linkName := fmt.Sprintf("%s-%s-gen-%d", hash, name, nextGen)

	// Create generation symlink
	genLink := filepath.Join(modpackDir, linkName)
	os.Remove(genLink) // Remove if exists
	if err := os.Symlink(storePath, genLink); err != nil {
		return fmt.Errorf("failed to create generation symlink: %w", err)
	}

	// Update "current build" symlink
	currentLink := m.config.GetCurrentBuildLink(name)
	os.Remove(currentLink)
	if err := os.Symlink(linkName, currentLink); err != nil {
		return fmt.Errorf("failed to update current build symlink: %w", err)
	}

	return nil
}

// Rollback rolls back a modpack to a specific generation.
func (m *ModpackManager) Rollback(name string, genNum int) error {
	generations, err := m.GetGenerations(name)
	if err != nil {
		return err
	}

	var targetGen *Generation
	for _, gen := range generations {
		if gen.Number == genNum {
			targetGen = &gen
			break
		}
	}

	if targetGen == nil {
		return fmt.Errorf("generation %d not found for modpack '%s'", genNum, name)
	}

	// Update "current build" symlink
	currentLink := m.config.GetCurrentBuildLink(name)
	os.Remove(currentLink)
	if err := os.Symlink(targetGen.Name, currentLink); err != nil {
		return fmt.Errorf("failed to rollback: %w", err)
	}

	return nil
}

// Delete removes a modpack registration (does not delete builds from store).
func (m *ModpackManager) Delete(name string) error {
	modpackPath := m.config.GetModpackPath(name)
	if _, err := os.Stat(modpackPath); os.IsNotExist(err) {
		return fmt.Errorf("modpack '%s' not found", name)
	}
	return os.RemoveAll(modpackPath)
}
