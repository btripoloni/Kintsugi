package primitives

import (
	"archive/zip"
	"context"
	"os"
	"path/filepath"
	"testing"

	"kintsugi/internal/store"
)

func TestExtract_Success(t *testing.T) {
	// 1. Create a dummy zip file
	tmpDir := t.TempDir()
	zipPath := filepath.Join(tmpDir, "test.zip")
	createZip(t, zipPath, map[string]string{
		"file1.txt":     "content1",
		"sub/file2.txt": "content2",
	})

	// 2. Setup Store
	storeDir := filepath.Join(tmpDir, ".kintsugi")
	sm, err := store.NewStore(storeDir)
	if err != nil {
		t.Fatal(err)
	}
	defer sm.Close()

	// 3. Define Step
	step := Step{
		ID: "step_extract",
		Op: "extract",
		Params: map[string]interface{}{
			"file": zipPath,
		},
	}

	// 4. Execute
	action := NewExtract()
	if err := action.Execute(context.Background(), step, sm); err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	// 5. Verify Output
	hash, _ := step.Hash()
	outDir := filepath.Join(sm.StorePath(), hash)

	verifyFileContent(t, filepath.Join(outDir, "file1.txt"), "content1")
	verifyFileContent(t, filepath.Join(outDir, "sub/file2.txt"), "content2")
}

func createZip(t *testing.T, path string, files map[string]string) {
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	w := zip.NewWriter(f)
	defer w.Close()

	for name, content := range files {
		f, err := w.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, err = f.Write([]byte(content))
		if err != nil {
			t.Fatal(err)
		}
	}
}

func verifyFileContent(t *testing.T, path, expected string) {
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Failed to read %s: %v", path, err)
	}
	if string(b) != expected {
		t.Errorf("Content mismatch in %s: got %s, want %s", path, string(b), expected)
	}
}
