package interpreter

import (
	"archive/zip"
	"embed"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

//go:embed *
var embeddedFS embed.FS

const denoVersion = "v1.46.0"

// EnsureInterpreter ensures that the embedded interpreter files are extracted to the target directory.
// It returns the path to the interpreter's mod.ts file.
func EnsureInterpreter() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get user home dir: %w", err)
	}

	targetDir := filepath.Join(home, ".kintsugi", "interpreter")

	if err := extractFS(embeddedFS, targetDir); err != nil {
		return "", fmt.Errorf("failed to extract interpreter: %w", err)
	}

	return filepath.Join(targetDir, "mod.ts"), nil
}

// EnsureDeno checks for Deno in PATH or ~/.kintsugi/bin/deno.
// If not found, it downloads and installs it.
// Returns the path to the Deno executable.
func EnsureDeno() (string, error) {
	// 1. Check PATH
	if path, err := exec.LookPath("deno"); err == nil {
		return path, nil
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	destDir := filepath.Join(home, ".kintsugi", "bin")
	denoPath := filepath.Join(destDir, "deno")
	if runtime.GOOS == "windows" {
		denoPath += ".exe"
	}

	// 2. Check local install
	if _, err := os.Stat(denoPath); err == nil {
		return denoPath, nil
	}

	// 3. Download
	fmt.Printf("Deno not found. Downloading %s...\n", denoVersion)
	if err := downloadDeno(destDir, denoPath); err != nil {
		return "", fmt.Errorf("failed to download deno: %w", err)
	}

	return denoPath, nil
}

func downloadDeno(destDir, finalPath string) error {
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}

	// Determine URL
	var target string
	switch runtime.GOOS {
	case "darwin":
		target = "apple-darwin"
	case "linux":
		target = "unknown-linux-gnu"
	case "windows":
		target = "pc-windows-msvc"
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}

	arch := runtime.GOARCH
	if arch == "amd64" {
		target = "x86_64-" + target
	} else if arch == "arm64" {
		target = "aarch64-" + target
	} else {
		return fmt.Errorf("unsupported Arch: %s", arch)
	}

	ext := "zip"
	if runtime.GOOS == "linux" || runtime.GOOS == "darwin" {
		// Deno uses zip for everything usually, but let's check.
		// Actually, recent releases use zip for all.
		// Wait, linux releases are .zip.
		ext = "zip"
	}

	url := fmt.Sprintf("https://github.com/denoland/deno/releases/download/%s/deno-%s.%s", denoVersion, target, ext)

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to download: status %d", resp.StatusCode)
	}

	// Create temp file for zip
	tmpZip, err := os.CreateTemp("", "deno-*.zip")
	if err != nil {
		return err
	}
	defer os.Remove(tmpZip.Name())
	defer tmpZip.Close()

	_, err = io.Copy(tmpZip, resp.Body)
	if err != nil {
		return err
	}
	tmpZip.Close() // Close before reading

	// Unzip
	r, err := zip.OpenReader(tmpZip.Name())
	if err != nil {
		return err
	}
	defer r.Close()

	found := false
	for _, f := range r.File {
		if f.Name == "deno" || f.Name == "deno.exe" {
			rc, err := f.Open()
			if err != nil {
				return err
			}
			defer rc.Close()

			outFile, err := os.OpenFile(finalPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0755)
			if err != nil {
				return err
			}
			defer outFile.Close()

			if _, err := io.Copy(outFile, rc); err != nil {
				return err
			}
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("deno binary not found in downloaded zip")
	}

	return nil
}

func extractFS(f fs.FS, targetDir string) error {
	return fs.WalkDir(f, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if path == "." {
			return nil
		}

		if filepath.Ext(path) == ".go" {
			return nil
		}

		targetPath := filepath.Join(targetDir, path)

		if d.IsDir() {
			return os.MkdirAll(targetPath, 0755)
		}

		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return err
		}

		data, err := fs.ReadFile(f, path)
		if err != nil {
			return err
		}

		if err := os.WriteFile(targetPath, data, 0644); err != nil {
			return err
		}

		return nil
	})
}
