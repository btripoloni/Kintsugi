package scheduler

import (
	"testing"

	"btripoloni.mod-manager/internal/spec"
)

func TestNewScheduler_BuildDAG(t *testing.T) {
	// A -> B (A depends on B)
	// C (Independent)
	input := &spec.Spec{
		Steps: []spec.Step{
			{ID: "A", Op: "compose", UseStep: []string{"B"}},
			{ID: "B", Op: "fetch_local"},
			{ID: "C", Op: "fetch_local"},
		},
	}

	sched, err := New(input, nil, nil) // Store and DB nil for now
	if err != nil {
		t.Fatalf("Failed to create scheduler: %v", err)
	}

	// Verify initial state
	if sched.pendingCount != 3 {
		t.Errorf("Expected 3 pending steps, got %d", sched.pendingCount)
	}

	// Verify Ready Queue
	// Should contain B and C (in-degree 0)
	ready := sched.GetReadySteps()
	if len(ready) != 2 {
		t.Errorf("Expected 2 ready steps, got %d", len(ready))
	}

	// Check content of ready steps (order might vary)
	foundB, foundC := false, false
	for _, s := range ready {
		if s.ID == "B" { foundB = true }
		if s.ID == "C" { foundC = true }
	}
	if !foundB || !foundC {
		t.Error("Expected Ready Queue to contain B and C")
	}
}

func TestScheduler_DetectCycle(t *testing.T) {
	// A -> B -> A
	input := &spec.Spec{
		Steps: []spec.Step{
			{ID: "A", Op: "compose", UseStep: []string{"B"}},
			{ID: "B", Op: "compose", UseStep: []string{"A"}},
		},
	}

	_, err := New(input, nil, nil)
	if err == nil {
		t.Error("Expected error for cyclic dependency, got nil")
	}
}
