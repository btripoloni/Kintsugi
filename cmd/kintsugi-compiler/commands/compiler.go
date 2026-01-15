package commands

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"

	"kintsugi/internal/recipe"
	"kintsugi/internal/store"
)

// Main execution logic for kintsugi-compiler
func Execute() {
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
		fmt.Printf("%d. %s (%s)\n", i+1, drv.Out, drv.Src.Type())
	}

	// 2. Execute Build
	for i, drv := range buildOrder {
		fmt.Printf("[%d/%d] Building %s (%s)...\n", i+1, len(buildOrder), drv.Out, drv.Src.Type())

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

	switch f := drv.Src.(type) {
	case *recipe.FetchLocal:
		return buildLocal(f, storePath)
	case *recipe.FetchBuild:
		return buildComposite(s, f, storePath)
	case *recipe.FetchUrl:
		return buildURL(f, storePath)
	case *recipe.FetchVase:
		return buildVase(s, f, storePath)
	case *recipe.WriteText:
		return buildWriteText(f, storePath)
	case *recipe.WriteJson:
		return buildWriteJson(f, storePath)
	case *recipe.WriteToml:
		return buildWriteToml(f, storePath)
	case *recipe.FetchGit:
		return buildGit(f, storePath)
	case *recipe.RunInBuild:
		return buildRunInBuild(s, f, storePath)
	case *recipe.BlankSource:
		return buildBlankSource(f, storePath)
	default:
		return fmt.Errorf("unknown fetcher type: %s", drv.Src.Type())
	}
}

func buildVase(s *store.Store, f *recipe.FetchVase, dest string) error {
	vaseName := f.Vase
	if vaseName == "" {
		return fmt.Errorf("vase source missing 'vase' name")
	}

	vasePath := filepath.Join(s.VasesPath(), vaseName)
	if _, err := os.Stat(vasePath); err != nil {
		return fmt.Errorf("vase '%s' not found: %w", vaseName, err)
	}

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	return linkTree(vasePath, dest)
}

func buildLocal(f *recipe.FetchLocal, dest string) error {
	srcPath := f.Path
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
		if err := os.MkdirAll(dest, 0755); err != nil {
			return err
		}
		if err := copyDir(srcPath, dest, f.Exclude); err != nil {
			return err
		}
		return runPostFetch(f.PostFetch, dest)
	}

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}
	if err := copyFile(srcPath, filepath.Join(dest, filepath.Base(srcPath))); err != nil {
		return err
	}

	return runPostFetch(f.PostFetch, dest)
}

func buildURL(f *recipe.FetchUrl, dest string) error {
	url := f.URL
	expectHash := f.SHA256

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

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	// Determine filename
	filename := filepath.Base(url)
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

	if f.Unpack {
		fmt.Printf("  -> Unpacking %s to %s\n", filename, dest)
		if err := extractArchive(destFile, dest); err != nil {
			return fmt.Errorf("failed to extract archive: %w", err)
		}
		os.Remove(destFile)
	}

	return runPostFetch(f.PostFetch, dest)
}

func buildWriteText(f *recipe.WriteText, dest string) error {
	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}
	fullPath := filepath.Join(dest, f.Path)
	// Create parent directories if the path contains subdirectories
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}
	return os.WriteFile(fullPath, []byte(f.Content), 0644)
}

func buildWriteJson(f *recipe.WriteJson, dest string) error {
	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}
	fullPath := filepath.Join(dest, f.Path)
	// Create parent directories if the path contains subdirectories
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(f.Content, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(fullPath, data, 0644)
}

func buildWriteToml(f *recipe.WriteToml, dest string) error {
	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}
	fullPath := filepath.Join(dest, f.Path)
	// Create parent directories if the path contains subdirectories
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}
	// Placeholder for TOML serialization.
	// We'll need a TOML library or a simple implementation.
	// For now, we'll write it as a simple string representation if it's a map.
	content := fmt.Sprintf("# TOML (placeholder implementation)\n# Full implementation requires a TOML library\n%v\n", f.Content)
	return os.WriteFile(fullPath, []byte(content), 0644)
}

func buildGit(f *recipe.FetchGit, dest string) error {
	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	// Clone to a temporary directory? Or directly to dest?
	// Git clone needs destination to be empty or non-existent.
	// Since we already created dest (storePath), we might need to handle it.
	// Actually, better clone to a temp dir and then move/hardlink?
	// For now, let's try direct clone if possible, or use a subfolder.

	tempDir, err := os.MkdirTemp("", "kintsugi-git-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tempDir)

	cmd := exec.Command("git", "clone", f.URL, tempDir)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git clone failed: %w", err)
	}

	if f.Rev != "" || f.Ref != "" {
		target := f.Rev
		if target == "" {
			target = f.Ref
		}
		cmd = exec.Command("git", "-C", tempDir, "checkout", target)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("git checkout %s failed: %w", target, err)
		}
	}

	// Remove .git
	os.RemoveAll(filepath.Join(tempDir, ".git"))

	if err := copyDir(tempDir, dest, nil); err != nil {
		return err
	}

	return runPostFetch(f.PostFetch, dest)
}

func buildBlankSource(f *recipe.BlankSource, dest string) error {
	// Create an empty directory for the blank source
	// This serves as a placeholder that can be filled with shards later
	fmt.Printf("Creating blank source directory at %s\n", dest)

	if err := os.MkdirAll(dest, 0755); err != nil {
		return fmt.Errorf("failed to create blank source directory: %w", err)
	}

	return nil
}

func buildRunInBuild(s *store.Store, f *recipe.RunInBuild, dest string) error {
	// 1. Load the build derivation
	buildDrv, err := s.LoadDerivation(f.Build)
	if err != nil {
		return fmt.Errorf("failed to load build derivation %s: %w", f.Build, err)
	}

	// 2. Get the build path in the store
	// The build should already be constructed (due to dependency resolution)
	// If it's a FetchBuild (composition), it's already constructed with all layers linked
	buildPath := filepath.Join(s.StorePath(), buildDrv.Out)
	if _, err := os.Stat(buildPath); err != nil {
		return fmt.Errorf("build derivation %s not found at %s (make sure it's built first): %w", f.Build, buildPath, err)
	}

	// 3. Create overlay directories
	overlayBase, err := os.MkdirTemp("", "kintsugi-run-in-build-overlay-*")
	if err != nil {
		return fmt.Errorf("failed to create overlay base directory: %w", err)
	}
	defer os.RemoveAll(overlayBase)

	upperDir := filepath.Join(overlayBase, "upper")
	workDir := filepath.Join(overlayBase, "work")
	mergedDir := filepath.Join(overlayBase, "merged")

	if err := os.MkdirAll(upperDir, 0755); err != nil {
		return fmt.Errorf("failed to create upper directory: %w", err)
	}
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return fmt.Errorf("failed to create work directory: %w", err)
	}
	if err := os.MkdirAll(mergedDir, 0755); err != nil {
		return fmt.Errorf("failed to create merged directory: %w", err)
	}

	// 4. Mount OverlayFS
	lowerOpt := fmt.Sprintf("lowerdir=%s", buildPath)
	upperOpt := fmt.Sprintf("upperdir=%s", upperDir)
	workOpt := fmt.Sprintf("workdir=%s", workDir)
	opts := fmt.Sprintf("%s,%s,%s", lowerOpt, upperOpt, workOpt)

	fmt.Printf("  -> Mounting OverlayFS...\n")
	if err := syscall.Mount("overlay", mergedDir, "overlay", 0, opts); err != nil {
		return fmt.Errorf("failed to mount overlayfs: %w", err)
	}
	defer func() {
		if err := syscall.Unmount(mergedDir, 0); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: failed to unmount overlayfs: %v\n", err)
		}
	}()

	// 5. Execute the command in the merged layer
	entrypoint := f.Command.Entrypoint
	entrypointPath := filepath.Join(mergedDir, entrypoint)

	var cmd *exec.Cmd
	if f.Command.Umu != nil {
		// Execute via UMU
		umuVersion := f.Command.Umu.Version
		umuID := f.Command.Umu.ID

		// Build umu-run command: umu-run run --umu-version <version> --umu-appid <id> <entrypoint> [args...]
		umuArgs := []string{
			"run",
			"--umu-version", umuVersion,
			"--umu-appid", umuID,
			entrypoint,
		}
		umuArgs = append(umuArgs, f.Command.Args...)

		cmd = exec.Command("umu-run", umuArgs...)
		cmd.Dir = mergedDir
	} else {
		// Execute natively
		cmd = exec.Command(entrypointPath, f.Command.Args...)
		cmd.Dir = mergedDir
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	fmt.Printf("  -> Executing command in build environment...\n")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("command execution failed: %w", err)
	}

	// 6. Capture outputs from upper layer using glob patterns
	if err := os.MkdirAll(dest, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	for _, outputPattern := range f.Outputs {
		matches, err := globMatch(upperDir, outputPattern)
		if err != nil {
			return fmt.Errorf("failed to match glob pattern %s: %w", outputPattern, err)
		}

		for _, match := range matches {
			relPath, err := filepath.Rel(upperDir, match)
			if err != nil {
				return fmt.Errorf("failed to compute relative path: %w", err)
			}

			destPath := filepath.Join(dest, relPath)

			info, err := os.Stat(match)
			if err != nil {
				continue // Skip if file doesn't exist
			}

			if info.IsDir() {
				if err := os.MkdirAll(destPath, info.Mode()); err != nil {
					return fmt.Errorf("failed to create destination directory: %w", err)
				}
				if err := copyDir(match, destPath, nil); err != nil {
					return fmt.Errorf("failed to copy directory: %w", err)
				}
			} else {
				if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
					return fmt.Errorf("failed to create parent directory: %w", err)
				}
				if err := copyFile(match, destPath); err != nil {
					return fmt.Errorf("failed to copy file: %w", err)
				}
			}
		}
	}

	fmt.Printf("  -> Captured outputs to %s\n", dest)
	return nil
}

// globMatch matches files and directories using glob patterns with support for ** (recursive matching)
func globMatch(rootDir, pattern string) ([]string, error) {
	var matches []string

	// Normalize pattern - remove leading / if present and convert to forward slashes
	pattern = strings.TrimPrefix(pattern, "/")
	pattern = filepath.ToSlash(pattern)

	// Check if pattern contains ** for recursive matching
	if !strings.Contains(pattern, "**") {
		// Simple glob without ** - use filepath.Glob
		globPattern := filepath.Join(rootDir, filepath.FromSlash(pattern))
		globMatches, err := filepath.Glob(globPattern)
		if err != nil {
			return nil, err
		}
		return globMatches, nil
	}

	// Handle ** pattern
	// For pattern like "prefix/**" or "prefix/**/suffix", we need to handle recursively
	parts := strings.SplitN(pattern, "**", 2)
	prefix := strings.TrimSuffix(parts[0], "/")
	suffix := ""
	if len(parts) > 1 {
		suffix = strings.TrimPrefix(parts[1], "/")
	}

	// Determine the base directory to start walking from
	walkRoot := rootDir
	if prefix != "" {
		walkRoot = filepath.Join(rootDir, filepath.FromSlash(prefix))
		// Check if the prefix directory exists
		if _, err := os.Stat(walkRoot); os.IsNotExist(err) {
			// Prefix doesn't exist, no matches
			return []string{}, nil
		}
	}

	// Walk the directory tree starting from walkRoot
	err := filepath.Walk(walkRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continue on error
		}

		// Calculate relative path from rootDir
		relPath, err := filepath.Rel(rootDir, path)
		if err != nil {
			return nil
		}

		relPathSlash := filepath.ToSlash(relPath)

		// Check if this path matches the pattern
		if suffix == "" {
			// Pattern is "prefix/**" - match everything under prefix
			matches = append(matches, path)
			return nil
		}

		// Pattern is "prefix/**/suffix" - need to check if path ends with suffix
		// Remove the prefix part and check the remaining
		var remaining string
		if prefix == "" {
			remaining = relPathSlash
		} else {
			// Remove prefix from the beginning
			if strings.HasPrefix(relPathSlash, prefix+"/") {
				remaining = relPathSlash[len(prefix+"/"):]
			} else if relPathSlash == prefix {
				remaining = ""
			} else {
				// Doesn't match prefix, skip
				return nil
			}
		}

		// Check if remaining ends with suffix
		if remaining == suffix || strings.HasSuffix(remaining, "/"+suffix) {
			matches = append(matches, path)
		}

		return nil
	})

	return matches, err
}

func extractArchive(src, dest string) error {
	// Determine the file extension to decide which extraction method to use
	ext := strings.ToLower(filepath.Ext(src))

	switch ext {
	case ".zip":
		return unzip(src, dest)
	case ".7z":
		return extract7z(src, dest)
	default:
		// For other extensions, try to determine based on magic bytes or file content
		// For now, default to zip for backward compatibility
		return unzip(src, dest)
	}
}

func extract7z(src, dest string) error {
	// Use the system's 7z command to extract the archive
	cmd := exec.Command("7z", "x", "-o"+dest, src)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to extract 7z archive: %w, output: %s", err, string(output))
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

func buildComposite(s *store.Store, f *recipe.FetchBuild, dest string) error {
	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	for _, layerHash := range f.Layers {
		layerDrv, err := s.LoadDerivation(layerHash)
		if err != nil {
			return fmt.Errorf("failed to load layer %s: %w", layerHash, err)
		}

		layerPath := filepath.Join(s.StorePath(), layerDrv.Out)

		if err := linkTree(layerPath, dest); err != nil {
			return fmt.Errorf("failed to link layer %s: %w", layerHash, err)
		}
	}
	return nil
}

func resolveDependencies(s *store.Store, rootHash string) ([]*recipe.Derivation, error) {
	visited := make(map[string]bool)
	var order []*recipe.Derivation

	var visit func(hash string) error
	visit = func(hash string) error {
		if visited[hash] {
			return nil
		}

		drv, err := s.LoadDerivation(hash)
		if err != nil {
			return err
		}

		for _, depHash := range drv.Dependencies {
			if err := visit(depHash); err != nil {
				return err
			}
		}

		if fb, ok := drv.Src.(*recipe.FetchBuild); ok {
			for _, layerHash := range fb.Layers {
				if err := visit(layerHash); err != nil {
					return err
				}
			}
		}

		if rib, ok := drv.Src.(*recipe.RunInBuild); ok {
			// Also visit the build dependency for run_in_build
			if err := visit(rib.Build); err != nil {
				return err
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

func runPostFetch(script string, dir string) error {
	if script == "" {
		return nil
	}
	fmt.Printf("  -> Running postFetch script...\n")
	cmd := exec.Command("sh", "-c", script)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	// Get source file info for permissions
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

func copyDir(src, dst string, exclude []string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		if rel == "." {
			return nil
		}

		// Check exclusions
		for _, pattern := range exclude {
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
			// Also check if any parent matches (for deeper files)
			// This is a simple implementation.
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
		return copyFile(path, destPath)
	})
}

func linkTree(srcRoot, dstRoot string) error {
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

		// Use hard link for files, fallback to symlink if it fails
		if err := os.Link(path, destPath); err != nil {
			if os.IsExist(err) {
				os.Remove(destPath)
				// Try again after removing
				if err := os.Link(path, destPath); err == nil {
					return nil
				}
			}
			// Fallback: symlink if hard link fails (e.g. cross-device)
			return os.Symlink(path, destPath)
		}
		return nil
	})
}
