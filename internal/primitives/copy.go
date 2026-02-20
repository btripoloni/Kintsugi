package primitives

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"kintsugi/internal/fs"
	"kintsugi/internal/store"
)

type Copy struct{}

func NewCopy() Action {
	return &Copy{}
}

func (c *Copy) Execute(ctx context.Context, step Step, sm *store.Store) error {
	// 1. Parse Params
	src, ok := step.Params["source"].(string)
	if !ok || src == "" {
		return fmt.Errorf("missing or invalid 'source' parameter")
	}

	dst, ok := step.Params["destination"].(string)
	if !ok || dst == "" {
		return fmt.Errorf("missing or invalid 'destination' parameter")
	}

	// 2. Validate Source
	info, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("source not found: %w", err)
	}

	// 3. Calculate Step Hash
	hash, err := step.Hash()
	if err != nil {
		return fmt.Errorf("failed to calculate hash: %w", err)
	}

	// 4. Perform Copy
	// Create output directory in store (using hash as directory name)
	outputDir := filepath.Join(sm.StorePath(), hash)
	if err := fs.EnsureDir(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Destination is relative to the Step's output dir
	// Prevent path traversal
	destPath := filepath.Join(outputDir, dst)
	if !fs.IsInDir(destPath, outputDir) {
		return fmt.Errorf("destination outside output directory")
	}

	if info.IsDir() {
		// For directories, copy the contents into the destination directory
		// The destination becomes the new directory name
		return fs.CopyDir(src, destPath, nil)
	}

	// For files, ensure parent dir exists and copy the file
	if err := fs.EnsureDir(filepath.Dir(destPath), os.ModePerm); err != nil {
		return err
	}
	return fs.CopyFile(src, destPath)
}
