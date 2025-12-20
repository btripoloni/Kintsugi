package primitives

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

type Compose struct{}

func NewCompose() Action {
	return &Compose{}
}

func (c *Compose) Execute(ctx context.Context, step spec.Step, sm *store.Manager) error {
	// 1. Parse Params
	mapping, ok := step.Params["mapping"].(map[string]interface{})
	if !ok {
		// Try generic map if types don't match exactly in unmarshaling
		return fmt.Errorf("missing or invalid 'mapping' parameter")
	}

	// 2. Calculate Hash
	hash, err := step.Hash()
	if err != nil {
		return fmt.Errorf("failed to calculate hash: %w", err)
	}

	// 4. Perform Composition
	finalDir := sm.Path(hash)
	return sm.Write(hash, func(dir string) error {
		for src, dstInterface := range mapping {
			dst, ok := dstInterface.(string)
			if !ok {
				return fmt.Errorf("invalid destination for source %s", src)
			}

			// Validate Source
			if _, err := os.Stat(src); err != nil {
				return fmt.Errorf("source not found: %s", src)
			}

			// Calculate Destination Path (Temporary for writing)
			destTemp := filepath.Join(dir, dst)
			if !isInDir(destTemp, dir) {
				return fmt.Errorf("destination outside output directory: %s", dst)
			}

			// Ensure parent dir exists
			if err := os.MkdirAll(filepath.Dir(destTemp), os.ModePerm); err != nil {
				return fmt.Errorf("failed to create directory for %s: %w", dst, err)
			}

			// Calculate Final Destination Path (For symlink resolution)
			destFinal := filepath.Join(finalDir, dst)

			// Create Relative Symlink if possible, else Absolute
			relSrc, err := filepath.Rel(filepath.Dir(destFinal), src)
			if err != nil {
				// Fallback to absolute
				relSrc = src
			}

			if err := os.Symlink(relSrc, destTemp); err != nil {
				return fmt.Errorf("failed to symlink %s to %s: %w", src, dst, err)
			}
		}
		return nil
	})
}
