package spec

import (
	"testing"
)

func TestStepHash_Deterministic(t *testing.T) {
	s1 := Step{
		ID: "test",
		Op: "fetch_url",
		Params: map[string]interface{}{
			"url": "http://example.com",
		},
	}
	s2 := Step{
		ID: "test",
		Op: "fetch_url",
		Params: map[string]interface{}{
			"url": "http://example.com",
		},
	}

	h1, err := s1.Hash()
	if err != nil {
		t.Fatalf("Hash() failed: %v", err)
	}
	h2, err := s2.Hash()
	if err != nil {
		t.Fatalf("Hash() failed: %v", err)
	}

	if h1 != h2 {
		t.Errorf("Expected hashes to be equal, got %s and %s", h1, h2)
	}
}

func TestStepHash_Changes(t *testing.T) {
	base := Step{
		ID: "test",
		Op: "fetch_url",
		Params: map[string]interface{}{
			"url": "http://example.com",
		},
	}
	
	// Change Op
	modified := base
	modified.Op = "fetch_local"
	h1, _ := base.Hash()
	h2, _ := modified.Hash()
	if h1 == h2 {
		t.Error("Hash collision when changing Op")
	}

	// Change Params
	modified = base
	modified.Params = map[string]interface{}{
		"url": "http://other.com",
	}
	h2, _ = modified.Hash()
	if h1 == h2 {
		t.Error("Hash collision when changing Params")
	}
}
