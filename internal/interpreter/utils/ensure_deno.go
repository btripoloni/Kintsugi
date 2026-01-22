package utils

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// EnsureDeno checks for Deno in PATH or ~/.kintsugi/bin/deno.
// If not found, it downloads and installs it.
// Returns the path to the Deno executable.
func EnsureDeno(denoVersion string) (string, error) {
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
	if err := downloadDeno(destDir, denoPath, denoVersion); err != nil {
		return "", fmt.Errorf("failed to download deno: %w", err)
	}

	return denoPath, nil
}
