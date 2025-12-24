package interpreter

import (
	"embed"
	"io"
	"io/fs"
	"os"
	"path/filepath"
)

//go:embed mod.ts lib/*.ts
var InterpreterAssets embed.FS

// ExtractAssets copies the embedded FS into a target directory.
func ExtractAssets(assets embed.FS, targetBase string) error {
	return fs.WalkDir(assets, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil
		}

		targetPath := filepath.Join(targetBase, path)
		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return err
		}

		sourceFile, err := assets.Open(path)
		if err != nil {
			return err
		}
		defer sourceFile.Close()

		targetFile, err := os.Create(targetPath)
		if err != nil {
			return err
		}
		defer targetFile.Close()

		_, err = io.Copy(targetFile, sourceFile)
		return err
	})
}
