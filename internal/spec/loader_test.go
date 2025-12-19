package spec

import (
	"strings"
	"testing"
)

func TestLoadSpec_Valid(t *testing.T) {
	json := `
	{
		"steps": [
			{
				"id": "download_jq",
				"op": "fetch_url",
				"params": {
					"url": "https://github.com/jqlang/jq/releases/download/jq-1.7/jq-linux64",
					"hash": "sha256:1234567890"
				}
			}
		]
	}
	`
	reader := strings.NewReader(json)
	
	s, err := Load(reader)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(s.Steps) != 1 {
		t.Errorf("Expected 1 step, got %d", len(s.Steps))
	}
	
	step := s.Steps[0]
	if step.ID != "download_jq" {
		t.Errorf("Expected step ID 'download_jq', got '%s'", step.ID)
	}
	if step.Op != "fetch_url" {
		t.Errorf("Expected op 'fetch_url', got '%s'", step.Op)
	}
}

func TestLoadSpec_InvalidJSON(t *testing.T) {
	json := `{ "steps": [ { "id": "broken" ` // Malformed
	reader := strings.NewReader(json)

	_, err := Load(reader)
	if err == nil {
		t.Fatal("Expected error for invalid JSON, got nil")
	}
}

func TestLoadSpec_MissingFields(t *testing.T) {
	// Missing 'op'
	json := `
	{
		"steps": [
			{
				"id": "missing_op",
				"params": {}
			}
		]
	}
	`
	reader := strings.NewReader(json)

	_, err := Load(reader)
	if err == nil {
		t.Fatal("Expected error for missing 'op' field, got nil")
	}
}
