package primitives

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

type Copy struct{}

func NewCopy() Action {
	return &Copy{}
}

func (c *Copy) Execute(ctx context.Context, step spec.Step, sm *store.Manager) error {
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
	return sm.Write(hash, func(dir string) error {
		// Destination is relative to the Step's output dir
		// Prevent path traversal
		destPath := filepath.Join(dir, dst)
		if !isInDir(destPath, dir) {
			return fmt.Errorf("destination outside output directory")
		}

		if info.IsDir() {
			return copyDir(src, destPath)
		}
		
		// Ensure parent dir exists
		if err := os.MkdirAll(filepath.Dir(destPath), os.ModePerm); err != nil {
			return err
		}
		return copyFile(src, destPath)
	})
}

func isInDir(path, dir string) bool {
	// Simple check, assumed cleaned paths
	// In production, use extensive check with EvalSymlinks if needed
	rel, err := filepath.Rel(dir, path)
	if err != nil {
		return false
	}
	return !isParent(rel)
}

func isParent(path string) bool {
	return path == ".." || (len(path) >= 3 && path[:3] == "../")
}

func copyDir(src, dst string) error {
	// Create destination directory
	if err := os.MkdirAll(dst, os.ModePerm); err != nil {
		return err
	}

	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Calculate relative path
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		destPath := filepath.Join(dst, rel)

		if info.IsDir() {
			return os.MkdirAll(destPath, os.ModePerm)
		}

		return copyFile(path, destPath)
	})
}
