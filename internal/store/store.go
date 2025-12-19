package store

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

type Manager struct {
	db        *sql.DB
	storePath string
}

func New(dbPath, storePath string) (*Manager, error) {
	// Ensure store directory exists
	if err := os.MkdirAll(storePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create store dir: %w", err)
	}

	// Ensure DB directory exists
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db dir: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open db: %w", err)
	}

	if err := initSchema(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to init schema: %w", err)
	}

	return &Manager{
		db:        db,
		storePath: storePath,
	}, nil
}

func initSchema(db *sql.DB) error {
	const createTable = `
	CREATE TABLE IF NOT EXISTS valid_paths (
		hash TEXT PRIMARY KEY,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.Exec(createTable)
	return err
}

func (m *Manager) Close() error {
	return m.db.Close()
}

func (m *Manager) Has(hash string) (bool, error) {
	var count int
	err := m.db.QueryRow("SELECT count(*) FROM valid_paths WHERE hash = ?", hash).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (m *Manager) Write(hash string, writer func(dir string) error) error {
	// Check if already exists
	exists, err := m.Has(hash)
	if err != nil {
		return err
	}
	if exists {
		return nil // idempotent loop
	}

	// Atomic write sequence:
	// 1. Create temp directory
	tmpDir := filepath.Join(m.storePath, ".tmp", uuid.New().String())
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir) // Cleanup on failure/exit

	// 2. Perform write
	if err := writer(tmpDir); err != nil {
		return fmt.Errorf("writer failed: %w", err)
	}

	// 3. Move to final path
	finalPath := m.Path(hash)
	// If final path exists (race condition), remove it first or fail? 
	// Since we checked Has() it shouldn't exist ideally, but let's be safe.
	if _, err := os.Stat(finalPath); err == nil {
		os.RemoveAll(finalPath)
	}
	
	if err := os.Rename(tmpDir, finalPath); err != nil {
		return fmt.Errorf("failed to move to final path: %w", err)
	}

	// 4. Mark as valid in DB
	_, err = m.db.Exec("INSERT INTO valid_paths (hash) VALUES (?)", hash)
	if err != nil {
		// Rollback file move if DB fails? Implementation detail usually relies on GC cleaning orphans
		// For strict atomicity we might want to delete finalPath, but for now let's return error
		return fmt.Errorf("failed to update db: %w", err)
	}

	return nil
}

func (m *Manager) Path(hash string) string {
	return filepath.Join(m.storePath, hash)
}
