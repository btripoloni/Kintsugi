package main

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"kintsugi/internal/recipe"
	"kintsugi/internal/store"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: kintsugi-compiler <root-recipe-hash>")
		os.Exit(1)
	}

	rootHash := os.Args[1]

	home, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}
	rootDir := filepath.Join(home, ".kintsugi")

	s, err := store.NewStore(rootDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to open store: %v\n", err)
		os.Exit(1)
	}
	defer s.Close()

	fmt.Printf("Compiler processing root hash: %s\n", rootHash)

	// 1. Build Dependency Graph
	buildOrder, err := resolveDependencies(s, rootHash)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Dependency resolution failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Build Plan (%d steps):\n", len(buildOrder))
	for i, drv := range buildOrder {
		fmt.Printf("%d. %s (%s)\n", i+1, drv.Out, drv.Src.Source)
	}

	// 2. Execute Build
	for i, drv := range buildOrder {
		fmt.Printf("[%d/%d] Building %s (%s)...\n", i+1, len(buildOrder), drv.Out, drv.Src.Source)

		if err := buildDerivation(s, drv); err != nil {
			fmt.Fprintf(os.Stderr, "Build failed for %s: %v\n", drv.Out, err)
			os.Exit(1)
		}
	}

	fmt.Println("All derivations built successfully.")
}

func buildDerivation(s *store.Store, drv *recipe.Derivation) error {
	storePath := filepath.Join(s.StorePath(), drv.Out)

	// Check if already exists? (Simple caching)
	if _, err := os.Stat(storePath); err == nil {
		fmt.Printf("  -> Cached at %s\n", storePath)
		return nil
	}

	switch drv.Src.Source {
	case recipe.SourceLocal:
		return buildLocal(s, drv, storePath)
	case recipe.SourceBuild:
		return buildComposite(s, drv, storePath)
	case recipe.SourceURL:
		return buildURL(s, drv, storePath)
	default:
		return fmt.Errorf("unknown source type: %s", drv.Src.Source)
	}
}

func buildLocal(s *store.Store, drv *recipe.Derivation, dest string) error {
	srcPath := drv.Src.Path
	if srcPath == "" {
		return fmt.Errorf("local source missing 'path'")
	}

	// Validate src exists
	info, err := os.Stat(srcPath)
	if err != nil {
		return fmt.Errorf("local source not found: %s", srcPath)
	}

	// Copy
	if info.IsDir() {
		return copyDir(srcPath, dest)
	}

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}
	return copyFile(srcPath, filepath.Join(dest, filepath.Base(srcPath)))
}

func buildURL(s *store.Store, drv *recipe.Derivation, dest string) error {
	url := drv.Src.URL
	expectHash := drv.Src.SHA256

	if url == "" || expectHash == "" {
		return fmt.Errorf("url source missing 'url' or 'sha256'")
	}

	fmt.Printf("Downloading %s...\n", url)

	// Download to temp file
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status: %s", resp.Status)
	}

	// Create temp file
	// We want to verify hash while downloading

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	// Determine filename
	filename := filepath.Base(url)
	// Handle query params?
	if idx := strings.Index(filename, "?"); idx != -1 {
		filename = filename[:idx]
	}
	if filename == "" || filename == "." {
		filename = "download"
	}

	destFile := filepath.Join(dest, filename)
	out, err := os.Create(destFile)
	if err != nil {
		return err
	}
	defer out.Close()

	hasher := sha256.New()
	reader := io.TeeReader(resp.Body, hasher)

	if _, err := io.Copy(out, reader); err != nil {
		return err
	}

	sum := hex.EncodeToString(hasher.Sum(nil))
	if sum != expectHash {
		os.RemoveAll(dest) // Clean up invalid download
		return fmt.Errorf("hash mismatch: expected %s, got %s", expectHash, sum)
	}

	fmt.Printf("  -> Verified hash %s\n", sum)

	if drv.Src.Unpack {
		fmt.Printf("  -> Unpacking %s to %s\n", filename, dest)
		// Close file to allow reopening or moving
		// Actually we verified hash of `destFile`.
		// If unpack is true, we should probably extract *contents* to `dest`
		// and remove the archive? Or keep it?
		// "Nix-like" usually means the output IS the extracted content.

		// 1. Unzip to temp dir or directly to dest?
		// We downloaded to dest/filename.
		// If we unzip to dest, we might have collisions or nested folders.
		// Standard behavior: Valid zip contents are placed in `dest`.

		if err := unzip(destFile, dest); err != nil {
			return fmt.Errorf("failed to unzip: %w", err)
		}

		// Remove the archive after unpacking?
		// Usually yes, if the derivation represents the *unpacked* source.
		os.Remove(destFile)
	}

	return nil
}

func unzip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		fpath := filepath.Join(dest, f.Name)

		// Check for Zip Slip
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("%s: illegal file path", fpath)
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

func buildComposite(s *store.Store, drv *recipe.Derivation, dest string) error {
	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	for _, layerHash := range drv.Src.Layers {
		layerDrv, err := s.LoadDerivation(layerHash)
		if err != nil {
			return fmt.Errorf("failed to load layer %s: %w", layerHash, err)
		}

		layerPath := filepath.Join(s.StorePath(), layerDrv.Out)

		// Symlink contents of layerPath into dest
		if err := symlinkTree(layerPath, dest); err != nil {
			return fmt.Errorf("failed to link layer %s: %w", layerHash, err)
		}
	}
	return nil
}

// resolveDependencies performs a depth-first traversal to generate a topological build order.
func resolveDependencies(s *store.Store, rootHash string) ([]*recipe.Derivation, error) {
	visited := make(map[string]bool)
	var order []*recipe.Derivation

	var visit func(hash string) error
	visit = func(hash string) error {
		if visited[hash] {
			return nil
		}

		// Load recipe
		drv, err := s.LoadDerivation(hash)
		if err != nil {
			return err
		}

		// Visit dependencies first
		for _, depHash := range drv.Dependencies {
			if err := visit(depHash); err != nil {
				return err
			}
		}

		// Also visit layers if source is 'build' (layers are dependencies)
		if drv.Src.Source == recipe.SourceBuild {
			for _, layerHash := range drv.Src.Layers {
				if err := visit(layerHash); err != nil {
					return err
				}
			}
		}

		visited[hash] = true
		order = append(order, drv)
		return nil
	}

	if err := visit(rootHash); err != nil {
		return nil, err
	}

	return order, nil
}

// Helpers

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		destPath := filepath.Join(dst, rel)

		if info.IsDir() {
			return os.MkdirAll(destPath, info.Mode())
		}
		return copyFile(path, destPath)
	})
}

func symlinkTree(srcRoot, dstRoot string) error {
	return filepath.Walk(srcRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if path == srcRoot {
			return nil
		}

		rel, _ := filepath.Rel(srcRoot, path)
		destPath := filepath.Join(dstRoot, rel)

		if info.IsDir() {
			return os.MkdirAll(destPath, 0755)
		}

		if err := os.Symlink(path, destPath); err != nil {
			if os.IsExist(err) {
				os.Remove(destPath)
				return os.Symlink(path, destPath)
			}
			return err
		}
		return nil
	})
}
