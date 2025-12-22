package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"kintsugi/internal/recipe"

	_ "github.com/mattn/go-sqlite3"
)

type Store struct {
	db      *sql.DB
	RootDir string
}

const schema = `
CREATE TABLE IF NOT EXISTS recipes (
    hash TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    expression TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS derivations (
    hash TEXT PRIMARY KEY,
    recipe_hash TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT NOT NULL, -- build, source, or meta
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_hash) REFERENCES recipes(hash)
);

CREATE TABLE IF NOT EXISTS derivation_dependencies (
    derivation_hash TEXT NOT NULL,
    dependency_hash TEXT NOT NULL,
    PRIMARY KEY (derivation_hash, dependency_hash),
    FOREIGN KEY (derivation_hash) REFERENCES derivations(hash),
    FOREIGN KEY (dependency_hash) REFERENCES derivations(hash)
);

CREATE INDEX IF NOT EXISTS idx_derivation_dependencies_dependency ON derivation_dependencies(dependency_hash);

CREATE TABLE IF NOT EXISTS modpacks (
    name TEXT PRIMARY KEY,
    active_derivation_hash TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (active_derivation_hash) REFERENCES derivations(hash)
);
`

func NewStore(rootDir string) (*Store, error) {
	// RootDir is ~/.kintsugi (or passed arg)
	// DB is at RootDir/kintsugi.db

	if err := os.MkdirAll(rootDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create root directory: %w", err)
	}

	dbPath := filepath.Join(rootDir, "kintsugi.db")

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	s := &Store{db: db, RootDir: rootDir}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, err
	}
	// Ensure subdirectories
	dirs := []string{"store", "recipes", "modpacks"}
	for _, d := range dirs {
		if err := os.MkdirAll(filepath.Join(rootDir, d), 0755); err != nil {
			db.Close()
			return nil, fmt.Errorf("failed to create subdir %s: %w", d, err)
		}
	}

	return s, nil
}

func (s *Store) StorePath() string {
	return filepath.Join(s.RootDir, "store")
}

func (s *Store) RecipesPath() string {
	return filepath.Join(s.RootDir, "recipes")
}

func (s *Store) GetDerivationPath(hash, name, version string) string {
	// Format: [hash]-[name]-[version]
	dirName := fmt.Sprintf("%s-%s-%s", hash, name, version)
	return filepath.Join(s.StorePath(), dirName)
}

func (s *Store) LoadDerivation(hash string) (*recipe.Derivation, error) {
	recipePath := filepath.Join(s.RecipesPath(), hash+".json")
	f, err := os.Open(recipePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open recipe file %s: %w", recipePath, err)
	}
	defer f.Close()

	var drv recipe.Derivation
	if err := json.NewDecoder(f).Decode(&drv); err != nil {
		return nil, fmt.Errorf("failed to decode recipe %s: %w", hash, err)
	}
	return &drv, nil
}

func (s *Store) migrate() error {
	_, err := s.db.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to migrate schema: %w", err)
	}
	return nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

// Placeholder methods for future implementation
func (s *Store) InsertRecipe(ctx context.Context, hash, name, expression string) error {
	_, err := s.db.ExecContext(ctx, "INSERT OR IGNORE INTO recipes (hash, name, expression) VALUES (?, ?, ?)", hash, name, expression)
	return err
}

func (s *Store) UpdateModpack(ctx context.Context, name, hash string) error {
	query := `
		INSERT INTO modpacks (name, active_derivation_hash, updated_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(name) DO UPDATE SET
			active_derivation_hash = excluded.active_derivation_hash,
			updated_at = excluded.updated_at;
	`
	_, err := s.db.ExecContext(ctx, query, name, hash)
	return err
}

func (s *Store) GetActiveModpack(ctx context.Context, name string) (string, error) {
	var hash string
	err := s.db.QueryRowContext(ctx, "SELECT active_derivation_hash FROM modpacks WHERE name = ?", name).Scan(&hash)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("modpack '%s' not found or has no active build", name)
	}
	if err != nil {
		return "", err
	}
	return hash, nil
}
