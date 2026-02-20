package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"syscall"

	"kintsugi/internal/cli"
	"kintsugi/internal/recipe"
	"kintsugi/internal/store"

	"github.com/spf13/cobra"
)

var RunCmd = &cobra.Command{
	Use:   "run <modpack_name> [run_spec]",
	Short: "Run the active build of a modpack",
	Args:  cobra.RangeArgs(1, 2),
	Run:   runRun,
}

func runRun(cmd *cobra.Command, args []string) {
	modpackName := args[0]
	runName := "default"
	if len(args) > 1 {
		runName = args[1]
	}

	// Initialize config and store
	config, err := cli.NewConfig()
	if err != nil {
		cli.Die("Failed to initialize config: %v", err)
	}

	s, err := store.NewStore(config.RootDir)
	if err != nil {
		cli.Die("Failed to open store: %v", err)
	}
	defer s.Close()

	// Resolve current build
	_, storePath, err := config.ResolveCurrentBuild(modpackName)
	if err != nil {
		cli.Die("Error: %v", err)
	}

	// Setup overlay directories
	modpackDir := config.GetModpackPath(modpackName)
	upperLayerPath := filepath.Join(modpackDir, "upperlayer")
	workLayerPath := filepath.Join(modpackDir, "worklayer")
	mountLayerPath := filepath.Join(modpackDir, "mountlayer")
	prefixDir := filepath.Join(modpackDir, "wine-prefix")

	for _, d := range []string{upperLayerPath, workLayerPath, mountLayerPath, prefixDir} {
		if err := os.MkdirAll(d, 0755); err != nil {
			cli.Die("Failed to create directory %s: %v", d, err)
		}
	}

	// Mount OverlayFS
	options := fmt.Sprintf("lowerdir=%s,upperdir=%s,workdir=%s", storePath, upperLayerPath, workLayerPath)
	mountCmd := exec.Command("fuse-overlayfs", "-o", options, mountLayerPath)

	out, err := mountCmd.CombinedOutput()
	if err != nil {
		cli.Die("Failed to mount overlayfs: %v\nLog: %s", err, string(out))
	}

	// Setup cleanup
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	defer unmountSafe(mountLayerPath)

	go func() {
		<-done
		unmountSafe(mountLayerPath)
		os.Exit(0)
	}()

	// Get the hash from the store path
	hash := filepath.Base(storePath)

	// Load and execute run spec
	runSpec, err := loadRunSpec(storePath, runName)
	if err != nil {
		cli.Die("Error: %v", err)
	}

	fmt.Printf("Running modpack '%s' with spec '%s'...\n", modpackName, runName)

	// Build and execute command
	if err := executeRunSpec(runSpec, mountLayerPath, storePath, modpackName, hash, prefixDir); err != nil {
		fmt.Fprintf(os.Stderr, "Execution failed: %v\n", err)
	}
}

// unmountSafe safely unmounts a FUSE filesystem.
func unmountSafe(path string) {
	cmdName := "fusermount3"
	if _, err := exec.LookPath(cmdName); err != nil {
		cmdName = "fusermount"
	}
	// Use -z (lazy) to ensure unmount even if process takes time to close
	_ = exec.Command(cmdName, "-u", "-z", path).Run()
}

// loadRunSpec loads a run specification from the store.
func loadRunSpec(storePath, runName string) (*recipe.RunSpec, error) {
	runJsonPath := filepath.Join(storePath, "kintsugi", "exec", fmt.Sprintf("%s.run.json", runName))
	if _, err := os.Stat(runJsonPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("run spec '%s' not found at %s", runName, runJsonPath)
	}

	data, err := os.ReadFile(runJsonPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read run spec: %w", err)
	}

	var runSpec recipe.RunSpec
	if err := json.Unmarshal(data, &runSpec); err != nil {
		return nil, fmt.Errorf("failed to parse run spec JSON: %w", err)
	}

	if runSpec.Entrypoint == "" {
		return nil, fmt.Errorf("run spec '%s' has no entrypoint defined", runName)
	}

	return &runSpec, nil
}

// executeRunSpec executes a run specification.
func executeRunSpec(runSpec *recipe.RunSpec, mountPath, storePath, modpackName, hash, prefixDir string) error {
	entrypointPath := filepath.Join(mountPath, runSpec.Entrypoint)

	var runCmd *exec.Cmd
	if runSpec.Umu != nil {
		// Execute via UMU
		umuArgs := []string{entrypointPath}
		umuArgs = append(umuArgs, runSpec.Args...)
		runCmd = exec.Command("umu-run", umuArgs...)
	} else {
		// Execute natively
		runCmd = exec.Command(entrypointPath, runSpec.Args...)
	}

	runCmd.Dir = storePath
	runCmd.Stdout = os.Stdout
	runCmd.Stderr = os.Stderr
	runCmd.Stdin = os.Stdin

	// Set environment variables
	env := os.Environ()
	env = append(env,
		fmt.Sprintf("KINTSUGI_ROOT=%s", storePath),
		fmt.Sprintf("KINTSUGI_MODPACK_NAME=%s", modpackName),
		fmt.Sprintf("KINTSUGI_BUILD_HASH=%s", hash),
		fmt.Sprintf("WINEPREFIX=%s", prefixDir),
	)

	// Add environment variables from RunSpec
	for key, value := range runSpec.Env {
		env = append(env, fmt.Sprintf("%s=%s", key, value))
	}

	runCmd.Env = env

	// Check if umu-run is available when needed
	if runSpec.Umu != nil {
		if _, err := exec.LookPath("umu-run"); err != nil {
			return fmt.Errorf("umu-run not found in PATH. Please install UMU-Launcher")
		}
	}

	return runCmd.Run()
}
