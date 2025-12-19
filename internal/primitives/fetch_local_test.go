package primitives

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

func TestFetchLocal_Success(t *testing.T) {
	// Setup temporary source file
	tmpDir := t.TempDir()
	srcFile := filepath.Join(tmpDir, "source.txt")
	if err := os.WriteFile(srcFile, []byte("content"), 0644); err != nil {
		t.Fatal(err)
	}

	// Setup Store
	storeDir := filepath.Join(tmpDir, "store")
	dbPath := filepath.Join(tmpDir, "db.sqlite")
	sm, err := store.New(dbPath, storeDir)
	if err != nil {
		t.Fatal(err)
	}
	defer sm.Close()

	// Define Step
	step := spec.Step{
		ID: "step1",
		Op: "fetch_local",
		Params: map[string]interface{}{
			"path": srcFile,
		},
	}

	// Calculate expected hash path
	hash, _ := step.Hash()
	expectedPath := sm.Path(hash)

	// Execute Action
	action := NewFetchLocal()
	err = action.Execute(context.Background(), step, sm)
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	// Verify file exists in store
	if _, err := os.Stat(filepath.Join(expectedPath, "source.txt")); os.IsNotExist(err) {
		t.Errorf("File not duplicated in store at %s", expectedPath)
	}
}

func TestFetchLocal_MissingParams(t *testing.T) {
	step := spec.Step{
		ID: "step1",
		Op: "fetch_local",
		Params: map[string]interface{}{}, // Missing "path"
	}

	action := NewFetchLocal()
	err := action.Execute(context.Background(), step, nil) // Store nil as it shouldn't be reached
	if err == nil {
		t.Error("Expected error for missing 'path' param, got nil")
	}
}
