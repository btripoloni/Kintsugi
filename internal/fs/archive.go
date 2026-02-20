package fs

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// ArchiveFormat represents the type of archive format.
type ArchiveFormat string

const (
	FormatZip  ArchiveFormat = "zip"
	Format7z   ArchiveFormat = "7z"
	FormatAuto ArchiveFormat = "auto" // Auto-detect based on extension
)

// ExtractOptions contains options for archive extraction.
type ExtractOptions struct {
	// Format specifies the archive format. If FormatAuto, it will be detected from extension.
	Format ArchiveFormat
}

// ExtractArchive extracts an archive file to the destination directory.
// It automatically detects the archive format based on file extension.
func ExtractArchive(src, dest string, opts *ExtractOptions) error {
	if opts == nil {
		opts = &ExtractOptions{Format: FormatAuto}
	}

	// Ensure destination exists
	if err := EnsureDir(dest, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	format := opts.Format
	if format == FormatAuto {
		format = detectArchiveFormat(src)
	}

	switch format {
	case FormatZip:
		return Unzip(src, dest)
	case Format7z:
		return Extract7z(src, dest)
	default:
		// Default to zip for backward compatibility
		return Unzip(src, dest)
	}
}

// detectArchiveFormat determines the archive format based on file extension.
func detectArchiveFormat(src string) ArchiveFormat {
	ext := strings.ToLower(filepath.Ext(src))
	switch ext {
	case ".zip":
		return FormatZip
	case ".7z":
		return Format7z
	default:
		return FormatZip // Default fallback
	}
}

// Unzip extracts a ZIP archive to the destination directory.
// It includes protection against Zip Slip vulnerability.
func Unzip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return fmt.Errorf("failed to open zip file: %w", err)
	}
	defer r.Close()

	for _, f := range r.File {
		fpath := filepath.Join(dest, f.Name)

		// Prevent Zip Slip vulnerability
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("illegal file path (zip slip detected): %s", fpath)
		}

		if f.FileInfo().IsDir() {
			if err := EnsureDir(fpath, os.ModePerm); err != nil {
				return err
			}
			continue
		}

		if err := EnsureDir(filepath.Dir(fpath), os.ModePerm); err != nil {
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

// Extract7z extracts a 7z archive to the destination directory.
// It requires the 7z command-line tool to be installed on the system.
func Extract7z(src, dest string) error {
	// Ensure destination directory exists
	if err := EnsureDir(dest, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	// The -o flag requires the path to end with a separator or be followed by a space
	destWithSep := dest
	if !strings.HasSuffix(destWithSep, string(os.PathSeparator)) {
		destWithSep = destWithSep + string(os.PathSeparator)
	}

	cmd := exec.Command("7z", "x", "-o"+destWithSep, "-y", src)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to extract 7z archive: %w, output: %s", err, string(output))
	}

	return nil
}
