// Package fs provides filesystem utility functions for the Kintsugi project.
// This package consolidates common file operations to eliminate code duplication.
package fs

import (
	"io"
	"os"
	"path/filepath"
	"strings"
)

// CopyFile copies a single file from src to dst, preserving permissions.
func CopyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	srcInfo, err := srcFile.Stat()
	if err != nil {
		return err
	}

	dstFile, err := os.OpenFile(dst, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, srcInfo.Mode())
	if err != nil {
		return err
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	return err
}

// CopyDirOptions contains options for directory copying operations.
type CopyDirOptions struct {
	// Exclude patterns to skip during copy (glob patterns)
	Exclude []string
}

// CopyDir copies a directory recursively from src to dst.
// If opts is nil, default options (no exclusions) are used.
// The dst directory will be created if it doesn't exist.
func CopyDir(src, dst string, opts *CopyDirOptions) error {
	if opts == nil {
		opts = &CopyDirOptions{}
	}

	// Ensure destination directory exists
	if err := os.MkdirAll(dst, 0755); err != nil {
		return err
	}

	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}

		// Check exclusions
		for _, pattern := range opts.Exclude {
			matched, err := filepath.Match(pattern, rel)
			if err != nil {
				continue
			}
			if matched {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}

			// Check if any parent matches the pattern
			parts := strings.Split(rel, string(os.PathSeparator))
			for i := 1; i <= len(parts); i++ {
				subRel := filepath.Join(parts[:i]...)
				matched, _ := filepath.Match(pattern, subRel)
				if matched {
					if info.IsDir() {
						return filepath.SkipDir
					}
					return nil
				}
			}
		}

		destPath := filepath.Join(dst, rel)

		if info.IsDir() {
			return os.MkdirAll(destPath, info.Mode())
		}
		return CopyFile(path, destPath)
	})
}

// IsInDir checks if a path is contained within a directory.
// This is useful for preventing path traversal attacks.
func IsInDir(path, dir string) bool {
	rel, err := filepath.Rel(dir, path)
	if err != nil {
		return false
	}
	return !isParentPath(rel)
}

// isParentPath checks if a relative path points to a parent directory.
func isParentPath(path string) bool {
	return path == ".." || (len(path) >= 3 && path[:3] == "../")
}

// EnsureDir creates a directory if it doesn't exist.
func EnsureDir(path string, perm os.FileMode) error {
	return os.MkdirAll(path, perm)
}
