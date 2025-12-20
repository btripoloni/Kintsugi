package primitives

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

type Extract struct{}

func NewExtract() Action {
	return &Extract{}
}

func (e *Extract) Execute(ctx context.Context, step spec.Step, sm *store.Manager) error {
	// 1. Parse Params
	path, ok := step.Params["file"].(string)
	if !ok || path == "" {
		return fmt.Errorf("missing or invalid 'file' parameter")
	}

	// 2. Validate Source file
	// Note: In a real scenario, this path might be checked to ensure it's within the Store
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

	// 4. Perform Extraction into Store
	return sm.Write(hash, func(dir string) error {
		return unzip(path, dir)
	})
}

func unzip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		// Prevent Zip Slip
		fpath := filepath.Join(dest, f.Name)
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("illegal file path: %s", fpath)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)

		outFile.Close()
		rc.Close()

		if err != nil {
			return err
		}
	}
	return nil
}
