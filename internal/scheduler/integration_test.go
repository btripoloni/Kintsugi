package scheduler_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"btripoloni.mod-manager/internal/primitives"
	"btripoloni.mod-manager/internal/scheduler"
	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

func TestIntegration_Scheduler_FetchLocal(t *testing.T) {
	// 1. Setup Environment
	tmpDir := t.TempDir()
	
	// Source File
	srcFile := filepath.Join(tmpDir, "source.txt")
	if err := os.WriteFile(srcFile, []byte("integrated_content"), 0644); err != nil {
		t.Fatal(err)
	}

	// Store
	storeDir := filepath.Join(tmpDir, "store")
	dbPath := filepath.Join(tmpDir, "db.sqlite")
	sm, err := store.New(dbPath, storeDir)
	if err != nil {
		t.Fatal(err)
	}
	defer sm.Close()

	// 2. Define Spec
	input := &spec.Spec{
		Steps: []spec.Step{
			{
				ID: "step1",
				Op: "fetch_local",
				Params: map[string]interface{}{
					"path": srcFile,
				},
			},
		},
	}

	// 3. Create Scheduler
	sched, err := scheduler.New(input, sm, nil)
	if err != nil {
		t.Fatalf("Failed to create scheduler: %v", err)
	}

	// 4. Define Executor using Factory
	executor := func(step spec.Step) error {
		action, err := primitives.New(step.Op)
		if err != nil {
			return err
		}
		return action.Execute(context.TODO(), step, sm)
	}

	// 5. Run
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := sched.Run(ctx, executor); err != nil {
		t.Fatalf("Scheduler run failed: %v", err)
	}

	// 6. Verify Store
	hash, _ := input.Steps[0].Hash()
	expectedPath := sm.Path(hash)
	
	content, err := os.ReadFile(filepath.Join(expectedPath, "source.txt"))
	if err != nil {
		t.Fatalf("Failed to read result from store: %v", err)
	}
	
	if string(content) != "integrated_content" {
		t.Errorf("Unexpected content in store: %s", string(content))
	}
}
