package fs

import (
	"os"
	"path/filepath"
)

// LinkTree creates hard links for all files from srcRoot to dstRoot.
// Directory structure is replicated, and hard links are used for files.
// If hard linking fails (e.g., cross-device), it falls back to symbolic links.
func LinkTree(srcRoot, dstRoot string) error {
	return filepath.Walk(srcRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if path == srcRoot {
			return nil
		}

		rel, err := filepath.Rel(srcRoot, path)
		if err != nil {
			return err
		}
		destPath := filepath.Join(dstRoot, rel)

		if info.IsDir() {
			return EnsureDir(destPath, 0755)
		}

		// Use hard link for files, fallback to symlink if it fails
		if err := os.Link(path, destPath); err != nil {
			if os.IsExist(err) {
				os.Remove(destPath)
				// Try again after removing
				if err := os.Link(path, destPath); err == nil {
					return nil
				}
			}
			// Fallback: symlink if hard link fails (e.g., cross-device)
			return os.Symlink(path, destPath)
		}
		return nil
	})
}

// SymlinkRelative creates a relative symbolic link from dst to src.
// It calculates the relative path from dst's parent directory to src.
func SymlinkRelative(src, dst string) error {
	// Calculate relative path from dst's parent to src
	relSrc, err := filepath.Rel(filepath.Dir(dst), src)
	if err != nil {
		// Fallback to absolute path
		relSrc = src
	}
	return os.Symlink(relSrc, dst)
}
