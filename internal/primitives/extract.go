package primitives

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"kintsugi/internal/fs"
	"kintsugi/internal/store"
)

type Extract struct{}

func NewExtract() Action {
	return &Extract{}
}

func (e *Extract) Execute(ctx context.Context, step Step, sm *store.Store) error {
	// 1. Parse Params
	path, ok := step.Params["file"].(string)
	if !ok || path == "" {
		return fmt.Errorf("missing or invalid 'file' parameter")
	}

	// 2. Validate Source file
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("source file not found: %w", err)
	}
	if info.IsDir() {
		return fmt.Errorf("extract expects a file, got directory")
	}

	// 3. Calculate Step Hash for Output Store
	hash, err := step.Hash()
	if err != nil {
		return fmt.Errorf("failed to calculate hash: %w", err)
	}

	// 4. Create output directory in store
	outputDir := filepath.Join(sm.StorePath(), hash)
	if err := fs.EnsureDir(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// 5. Perform Extraction into Store
	return fs.ExtractArchive(path, outputDir, nil)
}
