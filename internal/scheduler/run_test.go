package scheduler

import (
	"context"
	"testing"
	"time"

	"btripoloni.mod-manager/internal/spec"
)

// MockExecutor implements a simple executor for testing
type MockExecutor struct {
	executed []string
}

func (m *MockExecutor) Execute(ctx context.Context, step spec.Step) error {
	m.executed = append(m.executed, step.ID)
	return nil
}

func TestScheduler_Run_SimpleChain(t *testing.T) {
	// A -> B
	input := &spec.Spec{
		Steps: []spec.Step{
			{ID: "A", Op: "compose", UseStep: []string{"B"}},
			{ID: "B", Op: "fetch_local"},
		},
	}

	sched, err := New(input, nil, nil)
	if err != nil {
		t.Fatalf("Failed to create scheduler: %v", err)
	}

	// We need a way to inject a mock executor or define behavior.
	// For now, let's assume Scheduler.Run takes a callback or interface.
	// Since we haven't defined it yet, we'll definie it in the test for now 
	// and assume the implementation will follow.
	
	// Testing channel behavior effectively needs the Run method to exist.
	
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	executedCount := 0
	
	// Execute the scheduler
	// NOTE: This signature is hypothetical and will fail compilation until we stub it
	err = sched.Run(ctx, func(step spec.Step) error {
		executedCount++
		return nil
	})

	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	if executedCount != 2 {
		t.Errorf("Expected 2 executed steps, got %d", executedCount)
	}
}
