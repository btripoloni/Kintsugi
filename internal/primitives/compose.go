package primitives

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"kintsugi/internal/fs"
	"kintsugi/internal/store"
)

type Compose struct{}

func NewCompose() Action {
	return &Compose{}
}

func (c *Compose) Execute(ctx context.Context, step Step, sm *store.Store) error {
	// 1. Parse Params
	mapping, ok := step.Params["mapping"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("missing or invalid 'mapping' parameter")
	}

	// 2. Calculate Hash
	hash, err := step.Hash()
	if err != nil {
		return fmt.Errorf("failed to calculate hash: %w", err)
	}

	// 3. Create output directory in store
	outputDir := filepath.Join(sm.StorePath(), hash)
	if err := fs.EnsureDir(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// 4. Perform Composition
	for src, dstInterface := range mapping {
		dst, ok := dstInterface.(string)
		if !ok {
			return fmt.Errorf("invalid destination for source %s", src)
		}

		// Validate Source
		if _, err := os.Stat(src); err != nil {
			return fmt.Errorf("source not found: %s", src)
		}

		// Calculate Destination Path
		destPath := filepath.Join(outputDir, dst)
		if !fs.IsInDir(destPath, outputDir) {
			return fmt.Errorf("destination outside output directory: %s", dst)
		}

		// Ensure parent dir exists
		if err := fs.EnsureDir(filepath.Dir(destPath), os.ModePerm); err != nil {
			return fmt.Errorf("failed to create directory for %s: %w", dst, err)
		}

		// Create relative symlink
		if err := fs.SymlinkRelative(src, destPath); err != nil {
			return fmt.Errorf("failed to symlink %s to %s: %w", src, dst, err)
		}
	}
	return nil
}
