package compiler

import (
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

	"kintsugi/internal/fs"
	"kintsugi/internal/recipe"
)

// buildLocal handles fetch_local source type.
func (c *Compiler) buildLocal(f *recipe.FetchLocal, dest string) error {
	srcPath := f.Path
	if srcPath == "" {
		return fmt.Errorf("local source missing 'path'")
	}

	// If path is relative, resolve it relative to modpack directory
	if !filepath.IsAbs(srcPath) {
		modpackPath := c.modpackPath
		if modpackPath == "" {
			modpackPath = os.Getenv("KINTSUGI_MODPACK_PATH")
		}
		if modpackPath == "" {
			cwd, err := os.Getwd()
			if err != nil {
				return fmt.Errorf("failed to resolve relative path: no modpack path and cannot get CWD: %w", err)
			}
			modpackPath = cwd
		}
		srcPath = filepath.Join(modpackPath, srcPath)
	}

	// Validate source exists
	info, err := os.Stat(srcPath)
	if err != nil {
		return fmt.Errorf("local source not found: %s", srcPath)
	}

	// Create destination
	if err := fs.EnsureDir(dest, 0755); err != nil {
		return err
	}

	// Copy based on type
	if info.IsDir() {
		if err := fs.CopyDir(srcPath, dest, &fs.CopyDirOptions{Exclude: f.Exclude}); err != nil {
			return err
		}
	} else {
		if err := fs.CopyFile(srcPath, filepath.Join(dest, filepath.Base(srcPath))); err != nil {
			return err
		}
	}

	return runScript(f.PostFetch, dest, "postFetch")
}

// buildURL handles fetch_url source type.
func (c *Compiler) buildURL(f *recipe.FetchUrl, dest string) error {
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

	if err := fs.EnsureDir(dest, 0755); err != nil {
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

	hasher := sha256.New()
	reader := io.TeeReader(resp.Body, hasher)

	if _, err := io.Copy(out, reader); err != nil {
		out.Close()
		return err
	}

	// Close the file explicitly before verifying hash and extracting
	if err := out.Close(); err != nil {
		return fmt.Errorf("failed to close downloaded file: %w", err)
	}

	sum := hex.EncodeToString(hasher.Sum(nil))
	if sum != expectHash {
		os.RemoveAll(dest) // Clean up invalid download
		return fmt.Errorf("hash mismatch: expected %s, got %s", expectHash, sum)
	}

	fmt.Printf("  -> Verified hash %s\n", sum)

	if f.Unpack {
		fmt.Printf("  -> Unpacking %s to %s\n", filename, dest)
		if err := fs.ExtractArchive(destFile, dest, nil); err != nil {
			return fmt.Errorf("failed to extract archive: %w", err)
		}
		// Remove the archive file after successful extraction
		if err := os.Remove(destFile); err != nil {
			return fmt.Errorf("failed to remove archive file after extraction: %w", err)
		}
		fmt.Printf("  -> Removed archive file %s\n", filename)
	} else {
		fmt.Printf("  -> Skipping unpack (Unpack=false)\n")
	}

	return runScript(f.PostFetch, dest, "postFetch")
}

// buildVase handles fetch_vase source type.
func (c *Compiler) buildVase(f *recipe.FetchVase, dest string) error {
	vaseName := f.Vase
	if vaseName == "" {
		return fmt.Errorf("vase source missing 'vase' name")
	}

	vasePath := filepath.Join(c.store.VasesPath(), vaseName)
	if _, err := os.Stat(vasePath); err != nil {
		return fmt.Errorf("vase '%s' not found: %w", vaseName, err)
	}

	if err := fs.EnsureDir(dest, 0755); err != nil {
		return err
	}

	return fs.LinkTree(vasePath, dest)
}

// buildComposite handles fetch_build source type (composition of layers).
func (c *Compiler) buildComposite(f *recipe.FetchBuild, dest string) error {
	if err := fs.EnsureDir(dest, 0755); err != nil {
		return err
	}

	for _, layerHash := range f.Layers {
		layerDrv, err := c.store.LoadDerivation(layerHash)
		if err != nil {
			return fmt.Errorf("failed to load layer %s: %w", layerHash, err)
		}

		layerPath := filepath.Join(c.store.StorePath(), layerDrv.Out)

		if err := fs.LinkTree(layerPath, dest); err != nil {
			return fmt.Errorf("failed to link layer %s: %w", layerHash, err)
		}
	}
	return nil
}

// buildWriteText handles write_text source type.
func (c *Compiler) buildWriteText(f *recipe.WriteText, dest string) error {
	if err := fs.EnsureDir(dest, 0755); err != nil {
		return err
	}
	fullPath := filepath.Join(dest, f.Path)
	if err := fs.EnsureDir(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}
	return os.WriteFile(fullPath, []byte(f.Content), 0644)
}

// buildWriteJson handles write_json source type.
func (c *Compiler) buildWriteJson(f *recipe.WriteJson, dest string) error {
	if err := fs.EnsureDir(dest, 0755); err != nil {
		return err
	}
	fullPath := filepath.Join(dest, f.Path)
	if err := fs.EnsureDir(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(f.Content, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(fullPath, data, 0644)
}

// buildWriteToml handles write_toml source type.
func (c *Compiler) buildWriteToml(f *recipe.WriteToml, dest string) error {
	if err := fs.EnsureDir(dest, 0755); err != nil {
		return err
	}
	fullPath := filepath.Join(dest, f.Path)
	if err := fs.EnsureDir(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}
	// Placeholder for TOML serialization
	content := fmt.Sprintf("# TOML (placeholder implementation)\n# Full implementation requires a TOML library\n%v\n", f.Content)
	return os.WriteFile(fullPath, []byte(content), 0644)
}

// buildGit handles fetch_git source type.
func (c *Compiler) buildGit(f *recipe.FetchGit, dest string) error {
	if err := fs.EnsureDir(dest, 0755); err != nil {
		return err
	}

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

	// Remove .git directory
	os.RemoveAll(filepath.Join(tempDir, ".git"))

	if err := fs.CopyDir(tempDir, dest, nil); err != nil {
		return err
	}

	return runScript(f.PostFetch, dest, "postFetch")
}

// buildBlankSource handles blank_source type.
func (c *Compiler) buildBlankSource(dest string) error {
	fmt.Printf("Creating blank source directory at %s\n", dest)
	return fs.EnsureDir(dest, 0755)
}

// buildRunInBuild handles run_in_build source type.
func (c *Compiler) buildRunInBuild(f *recipe.RunInBuild, dest string) error {
	// 1. Load the build derivation
	buildDrv, err := c.store.LoadDerivation(f.Build)
	if err != nil {
		return fmt.Errorf("failed to load build derivation %s: %w", f.Build, err)
	}

	// 2. Get the build path in the store
	buildPath := filepath.Join(c.store.StorePath(), buildDrv.Out)
	if _, err := os.Stat(buildPath); err != nil {
		return fmt.Errorf("build derivation %s not found at %s: %w", f.Build, buildPath, err)
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

	if err := fs.EnsureDir(upperDir, 0755); err != nil {
		return fmt.Errorf("failed to create upper directory: %w", err)
	}
	if err := fs.EnsureDir(workDir, 0755); err != nil {
		return fmt.Errorf("failed to create work directory: %w", err)
	}
	if err := fs.EnsureDir(mergedDir, 0755); err != nil {
		return fmt.Errorf("failed to create merged directory: %w", err)
	}

	// 4. Mount OverlayFS
	opts := fmt.Sprintf("lowerdir=%s,upperdir=%s,workdir=%s", buildPath, upperDir, workDir)

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
		umuArgs := []string{
			"run",
			"--umu-version", f.Command.Umu.Version,
			"--umu-appid", f.Command.Umu.ID,
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
	if err := fs.EnsureDir(dest, 0755); err != nil {
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
				if err := fs.EnsureDir(destPath, info.Mode()); err != nil {
					return fmt.Errorf("failed to create destination directory: %w", err)
				}
				if err := fs.CopyDir(match, destPath, nil); err != nil {
					return fmt.Errorf("failed to copy directory: %w", err)
				}
			} else {
				if err := fs.EnsureDir(filepath.Dir(destPath), 0755); err != nil {
					return fmt.Errorf("failed to create parent directory: %w", err)
				}
				if err := fs.CopyFile(match, destPath); err != nil {
					return fmt.Errorf("failed to copy file: %w", err)
				}
			}
		}
	}

	fmt.Printf("  -> Captured outputs to %s\n", dest)
	return nil
}

// globMatch matches files and directories using glob patterns with support for ** (recursive matching).
func globMatch(rootDir, pattern string) ([]string, error) {
	var matches []string

	// Normalize pattern
	pattern = strings.TrimPrefix(pattern, "/")
	pattern = filepath.ToSlash(pattern)

	// Check if pattern contains ** for recursive matching
	if !strings.Contains(pattern, "**") {
		// Simple glob without ** - use filepath.Glob
		globPattern := filepath.Join(rootDir, filepath.FromSlash(pattern))
		return filepath.Glob(globPattern)
	}

	// Handle ** pattern
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
		if _, err := os.Stat(walkRoot); os.IsNotExist(err) {
			return []string{}, nil
		}
	}

	// Walk the directory tree
	err := filepath.Walk(walkRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continue on error
		}

		relPath, err := filepath.Rel(rootDir, path)
		if err != nil {
			return nil
		}

		relPathSlash := filepath.ToSlash(relPath)

		if suffix == "" {
			// Pattern is "prefix/**" - match everything under prefix
			matches = append(matches, path)
			return nil
		}

		// Pattern is "prefix/**/suffix" - check if path ends with suffix
		var remaining string
		if prefix == "" {
			remaining = relPathSlash
		} else {
			if strings.HasPrefix(relPathSlash, prefix+"/") {
				remaining = relPathSlash[len(prefix+"/"):]
			} else if relPathSlash == prefix {
				remaining = ""
			} else {
				return nil
			}
		}

		if remaining == suffix || strings.HasSuffix(remaining, "/"+suffix) {
			matches = append(matches, path)
		}

		return nil
	})

	return matches, err
}

// runScript executes a shell script in the given directory.
func runScript(script string, dir string, scriptType string) error {
	if script == "" {
		return nil
	}
	fmt.Printf("  -> Running %s script...\n", scriptType)
	cmd := exec.Command("sh", "-c", script)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s script failed: %w", scriptType, err)
	}
	return nil
}
