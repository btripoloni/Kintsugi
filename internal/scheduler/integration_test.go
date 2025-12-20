package scheduler_test

import (
	"archive/zip"
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

func TestIntegration_Chain(t *testing.T) {
	// 1. Setup Environment
	tmpDir := t.TempDir()
	
	// Prepare Source Zip
	zipPath := filepath.Join(tmpDir, "mod.zip")
	createZip(t, zipPath, map[string]string{"data/mod.txt": "MOD_CONTENT"})

	// Store
	storeDir := filepath.Join(tmpDir, "store")
	dbPath := filepath.Join(tmpDir, "db.sqlite")
	sm, err := store.New(dbPath, storeDir)
	if err != nil {
		t.Fatal(err)
	}
	defer sm.Close()

	// 2. Define Spec (Chain)
	// fetch_local -> extract -> compose
	input := &spec.Spec{
		Steps: []spec.Step{
			{
				ID: "step_fetch",
				Op: "fetch_local",
				Params: map[string]interface{}{
					"path": zipPath,
				},
			},
			{
				ID: "step_extract",
				Op: "extract",
				Params: map[string]interface{}{
					// We need to know the output path of step_fetch?
					// Or does extract take absolute path?
					// For this test, valid absolute path to the file in store is needed.
					// BUT hash is deterministic. We can pre-calculate it? 
					// Or easier: Just pass the zipPath as input for now (simulating fetch_local just did it)
					// Wait, if step_extract depends on step_fetch, it implies using fetch output.
					// But our primitives take direct file paths in Params.
					// For Integration Test, we need to construct the path that fetch_local produced.
					// Let's cheat slightly and use 'zipPath' (source) directly if we can't easily predict store path?
					// NO, we should try to use the store path if possible to test full flow.
					// But we don't know the hash before running unless we calculcate it.
					// Let's compute hash of step_fetch first.
				},
				UseStep: []string{"step_fetch"},
			},
			{
				ID: "step_compose",
				Op: "compose",
				Params: map[string]interface{}{
					// Mapping will be populated dynamically or we hardcode based on extract output
				},
				UseStep: []string{"step_extract"},
			},
		},
	}
	
	// FIX: Simulating the "Orchestrator" behavior which would resolve paths.
	// We calculate step_fetch hash to predict where the file will be.
	stepFetch := input.Steps[0]
	hFetch, _ := stepFetch.Hash()
	pathInStore := filepath.Join(sm.Path(hFetch), "mod.zip")
	
	// Update Extract Params
	input.Steps[1].Params = map[string]interface{}{
		"file": pathInStore,
	}

	// Calculate Extract Hash to predict output
	stepExtract := input.Steps[1] // ID: step_extract
	hExtract, _ := stepExtract.Hash()
	extractedFile := filepath.Join(sm.Path(hExtract), "data/mod.txt")

	// Update Compose Params
	input.Steps[2].Params = map[string]interface{}{
		"mapping": map[string]interface{}{
			extractedFile: "final_mod.txt",
		},
	}

	// 3. Create Scheduler
	sched, err := scheduler.New(input, sm, nil)
	if err != nil {
		t.Fatalf("Failed to create scheduler: %v", err)
	}

	// 4. Define Executor
	executor := func(step spec.Step) error {
		action, err := primitives.New(step.Op)
		if err != nil {
			return err
		}
		// In a real run, the step params might be updated/interpolated by the runner? 
		// Here we pre-resolved them.
		return action.Execute(context.TODO(), step, sm)
	}

	// 5. Run
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sched.Run(ctx, executor); err != nil {
		t.Fatalf("Scheduler run failed: %v", err)
	}

	// 6. Verify Result (Compose Output)
	// step_compose Output
	hCompose, _ := input.Steps[2].Hash()
	composeDir := sm.Path(hCompose)
	finalPath := filepath.Join(composeDir, "final_mod.txt")

	verifyFile(t, finalPath, "MOD_CONTENT")
}

func verifyFile(t *testing.T, path, content string) {
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Failed to read %s: %v", path, err)
	}
	if string(b) != content {
		t.Errorf("Content mismatch: got %s, want %s", string(b), content)
	}
}

func createZip(t *testing.T, path string, files map[string]string) {
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	w := zip.NewWriter(f)
	defer w.Close()

	for name, content := range files {
		f, err := w.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, err = f.Write([]byte(content))
		if err != nil {
			t.Fatal(err)
		}
	}
}
