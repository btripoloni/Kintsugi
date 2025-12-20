package primitives

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

func TestCompose_Success(t *testing.T) {
	// 1. Setup Input
	tmpDir := t.TempDir()
	srcFile := filepath.Join(tmpDir, "source.txt")
	if err := os.WriteFile(srcFile, []byte("original"), 0644); err != nil {
		t.Fatal(err)
	}

	// 2. Setup Store
	storeDir := filepath.Join(tmpDir, "store")
	dbPath := filepath.Join(tmpDir, "db.sqlite")
	sm, err := store.New(dbPath, storeDir)
	if err != nil {
		t.Fatal(err)
	}
	defer sm.Close()

	// 3. Define Step
	step := spec.Step{
		ID: "step_compose",
		Op: "compose",
		Params: map[string]interface{}{
			"mapping": map[string]interface{}{
				srcFile: "link.txt",
			},
		},
	}

	// 4. Run
	action := NewCompose()
	if err := action.Execute(context.Background(), step, sm); err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	// 5. Verify
	hash, _ := step.Hash()
	outDir := sm.Path(hash)
	linkPath := filepath.Join(outDir, "link.txt")
	
	// Check if it is a symlink
	info, err := os.Lstat(linkPath)
	if err != nil {
		t.Fatalf("Failed to stat link: %v", err)
	}
	if info.Mode()&os.ModeSymlink == 0 {
		t.Errorf("Expected symlink, got %v", info.Mode())
	}

	// Check content
	verifyFileContent(t, linkPath, "original")
}
