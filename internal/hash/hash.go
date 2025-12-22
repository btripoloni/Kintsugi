package hash

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
)

// ComputeHash calculates the truncated SHA256 hash of the given object.
// It uses a deterministic JSON serialization (sorting keys).
func ComputeHash(v interface{}) (string, error) {
	// Basic JSON marshaling in Go sorts map keys by default, ensuring determinism for maps.
	// However, if v contains fields that are not deterministic (e.g. unsorted slices if order doesn't matter),
	// the caller must ensure v is already normalized.
	// For recipes, we assume the struct fields are sufficient.

	data, err := json.Marshal(v)
	if err != nil {
		return "", err
	}

	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])[:32], nil
}

// ComputeHashFromBytes computes hash from raw bytes
func ComputeHashFromBytes(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])[:32]
}
