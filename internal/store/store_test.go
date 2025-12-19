package store

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewStore_InitDB(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "metadata.db")
	storePath := filepath.Join(tmpDir, "store")

	s, err := New(dbPath, storePath)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer s.Close()

	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		t.Errorf("Database file not created at %s", dbPath)
	}
}

func TestStore_Has_NotFound(t *testing.T) {
	tmpDir := t.TempDir()
	s, err := New(filepath.Join(tmpDir, "db.sqlite"), filepath.Join(tmpDir, "store"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()

	exists, err := s.Has("non-existent-hash")
	if err != nil {
		t.Fatalf("Has() failed: %v", err)
	}
	if exists {
		t.Error("Expected Has() to return false, got true")
	}
}

func TestStore_Write_Atomic(t *testing.T) {
	tmpDir := t.TempDir()
	s, err := New(filepath.Join(tmpDir, "db.sqlite"), filepath.Join(tmpDir, "store"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()

	hash := "test-hash-123"
	
	// Write operation
	err = s.Write(hash, func(dir string) error {
		// Simulate writing a file
		return os.WriteFile(filepath.Join(dir, "data.txt"), []byte("hello"), 0644)
	})
	if err != nil {
		t.Fatalf("Write() failed: %v", err)
	}

	// Verify persistence
	exists, err := s.Has(hash)
	if err != nil {
		t.Fatalf("Has() failed: %v", err)
	}
	if !exists {
		t.Error("Expected Has() to return true after Write")
	}

	// Verify file existence in final path
	finalPath := s.Path(hash)
	if _, err := os.Stat(filepath.Join(finalPath, "data.txt")); os.IsNotExist(err) {
		t.Error("File not found in final store path")
	}
}
