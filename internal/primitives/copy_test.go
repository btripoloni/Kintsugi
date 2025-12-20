package primitives

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

func TestCopy_File(t *testing.T) {
	// 1. Setup Input
	tmpDir := t.TempDir()
	srcFile := filepath.Join(tmpDir, "input.txt")
	if err := os.WriteFile(srcFile, []byte("hello"), 0644); err != nil {
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
		ID: "step_copy",
		Op: "copy",
		Params: map[string]interface{}{
			"source":      srcFile,
			"destination": "output.txt",
		},
	}

	// 4. Run
	action := NewCopy()
	if err := action.Execute(context.Background(), step, sm); err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	// 5. Verify
	hash, _ := step.Hash()
	outPath := filepath.Join(sm.Path(hash), "output.txt")
	verifyFileContent(t, outPath, "hello")
}

func TestCopy_Dir(t *testing.T) {
	// 1. Setup Input Dir
	tmpDir := t.TempDir()
	srcDir := filepath.Join(tmpDir, "src")
	os.Mkdir(srcDir, 0755)
	os.WriteFile(filepath.Join(srcDir, "a.txt"), []byte("A"), 0644)
	os.Mkdir(filepath.Join(srcDir, "sub"), 0755)
	os.WriteFile(filepath.Join(srcDir, "sub/b.txt"), []byte("B"), 0644)

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
		ID: "step_copy_dir",
		Op: "copy",
		Params: map[string]interface{}{
			"source":      srcDir,
			"destination": "copied_dir",
		},
	}

	// 4. Run
	action := NewCopy()
	if err := action.Execute(context.Background(), step, sm); err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	// 5. Verify
	hash, _ := step.Hash()
	outDir := filepath.Join(sm.Path(hash), "copied_dir")
	
	verifyFileContent(t, filepath.Join(outDir, "a.txt"), "A")
	verifyFileContent(t, filepath.Join(outDir, "sub/b.txt"), "B")
}
