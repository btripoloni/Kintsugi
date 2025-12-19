package spec

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
)

// Spec represents the build plan
type Spec struct {
	Steps []Step `json:"steps"`
}

// Step represents a single operation in the build plan
type Step struct {
	ID      string                 `json:"id"`
	Op      string                 `json:"op"`
	Params  map[string]interface{} `json:"params"`
	UseStep []string               `json:"use_step"`
}

// Hash calculates a deterministic SHA256 hash of the Step configuration
// It includes Op, Params, and UseStep. ID is intentionally excluded to allow stable content addressing.
func (s *Step) Hash() (string, error) {
	// 1. Create a struct with only the fields that matter for the hash
	type hashInput struct {
		Op      string                 `json:"op"`
		Params  map[string]interface{} `json:"params"`
		UseStep []string               `json:"use_step"`
	}
	
	input := hashInput{
		Op:      s.Op,
		Params:  s.Params,
		UseStep: s.UseStep,
	}

	// 2. Marshal to JSON (Go's JSON marshaler sorts map keys, providing stability)
	bytes, err := json.Marshal(input)
	if err != nil {
		return "", fmt.Errorf("failed to marshal step for hashing: %w", err)
	}

	// 3. Calculate SHA256
	hash := sha256.Sum256(bytes)
	
	// 4. Return as Hex string
	return hex.EncodeToString(hash[:]), nil
}

// Load reads and validates a Spec from an io.Reader
func Load(r io.Reader) (*Spec, error) {
	var s Spec
	decoder := json.NewDecoder(r)
	if err := decoder.Decode(&s); err != nil {
		return nil, err
	}

	// Validation
	for i, step := range s.Steps {
		if step.ID == "" {
			return nil, fmt.Errorf("step %d missing id", i)
		}
		if step.Op == "" {
			return nil, fmt.Errorf("step %s missing op", step.ID)
		}
	}

	return &s, nil
}
