package primitives

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

// Action defines a primitive operation execution contract
type Action interface {
	Execute(ctx context.Context, step spec.Step, store *store.Manager) error
}

type FetchLocal struct{}

func NewFetchLocal() Action {
	return &FetchLocal{}
}

func (f *FetchLocal) Execute(ctx context.Context, step spec.Step, sm *store.Manager) error {
	// 1. Parse Params
	path, ok := step.Params["path"].(string)
	if !ok || path == "" {
		return fmt.Errorf("missing or invalid 'path' parameter")
	}

	// 2. Resolve absolute path (security note: should validate if it's within allowed paths?)
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("failed to resolve path: %w", err)
	}

	// 3. Check source existence
	info, err := os.Stat(absPath)
	if err != nil {
		return fmt.Errorf("source file not found: %w", err)
	}
	if info.IsDir() {
		return fmt.Errorf("fetch_local currently supports only files, got directory")
	}

	// 4. Calculate Step Hash for Store
	hash, err := step.Hash()
	if err != nil {
		return fmt.Errorf("failed to calculate hash: %w", err)
	}

	// 5. Write to Store (Atomic)
	return sm.Write(hash, func(dir string) error {
		// Copy file to 'dir'
		// We use base name to keep sanity
		destPath := filepath.Join(dir, filepath.Base(absPath))
		return copyFile(absPath, destPath)
	})
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, sourceFile); err != nil {
		return err
	}
	return nil
}
