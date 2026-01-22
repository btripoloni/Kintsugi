package primitives

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"

	"kintsugi/internal/store"
)

// Action interface defines the contract for primitive operations
type Action interface {
	Execute(ctx context.Context, step Step, sm *store.Store) error
}

// Step represents a build step with parameters
type Step struct {
	ID     string                 `json:"id"`
	Op     string                 `json:"op"`
	Params map[string]interface{} `json:"params"`
}

// Hash calculates a deterministic hash for the step
func (s *Step) Hash() (string, error) {
	// Serialize the step to JSON for hashing
	data, err := json.Marshal(s)
	if err != nil {
		return "", err
	}

	// Calculate SHA256 hash
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:]), nil
}
