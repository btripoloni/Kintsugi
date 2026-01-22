package utils

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
)

func downloadDeno(destDir, finalPath, denoVersion string) error {
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
