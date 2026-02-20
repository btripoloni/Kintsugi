package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"kintsugi/internal/cli"
	"kintsugi/internal/interpreter"
	"kintsugi/internal/store"

	"github.com/spf13/cobra"
)

var BuildCmd = &cobra.Command{
	Use:   "build",
	Short: "Build the current modpack",
	Run:   runBuild,
}

func runBuild(cmd *cobra.Command, args []string) {
	cwd, err := os.Getwd()
	if err != nil {
		cli.Die("Error getting CWD: %v", err)
	}

	// Check for main.ts
	mainTsPath := filepath.Join(cwd, "main.ts")
	if _, err := os.Stat(mainTsPath); os.IsNotExist(err) {
		cli.Die("main.ts not found in %s", cwd)
	}

	fmt.Println("Building modpack...")

	// Ensure Deno is available
	denoBin, err := interpreter.EnsureDeno()
	if err != nil {
		cli.Die("Failed to ensure Deno: %v", err)
	}

	// Run interpreter to get root hash
	rootHash, err := runInterpreter(denoBin, cwd)
	if err != nil {
		cli.Die("Interpreter failed: %v", err)
	}

	fmt.Printf("Interpreter success. Root Hash: %s\n", rootHash)

	// Find and run compiler
	compilerBinPath, err := findCompiler()
	if err != nil {
		cli.Die("Compiler not found: %v", err)
	}

	fmt.Printf("Running compiler: %s %s\n", compilerBinPath, rootHash)

	if err := runCompiler(compilerBinPath, rootHash, cwd); err != nil {
		cli.Die("Compiler failed: %v", err)
	}

	fmt.Println("Build complete.")

	// Register the modpack
	if err := registerModpack(cwd, rootHash); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Failed to register modpack: %v\n", err)
	}
}

// runInterpreter executes the Deno interpreter and returns the root hash.
func runInterpreter(denoBin, cwd string) (string, error) {
	// Create temporary runner script from embedded content
	runnerScript := interpreter.GetRunnerScript()
	tmpRunner, err := os.CreateTemp("", "kintsugi_runner_*.ts")
	if err != nil {
		return "", fmt.Errorf("failed to create temp runner: %w", err)
	}
	defer os.Remove(tmpRunner.Name())

	if _, err := tmpRunner.Write(runnerScript); err != nil {
		return "", fmt.Errorf("failed to write runner: %w", err)
	}
	if err := tmpRunner.Close(); err != nil {
		return "", fmt.Errorf("failed to close runner: %w", err)
	}

	runnerPath := tmpRunner.Name()

	// Build Deno arguments
	denoArgs := []string{"run", "--allow-read", "--allow-write", "--allow-env"}
	denoJsonPath := filepath.Join(cwd, "deno.json")
	if _, err := os.Stat(denoJsonPath); err == nil {
		denoArgs = append(denoArgs, "--config", denoJsonPath)
	}
	denoArgs = append(denoArgs, runnerPath, cwd)

	denoCmd := exec.Command(denoBin, denoArgs...)
	denoCmd.Dir = cwd
	output, err := denoCmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("%w\nStderr: %s", err, exitErr.Stderr)
		}
		return "", err
	}

	return strings.TrimSpace(string(output)), nil
}

// findCompiler locates the kintsugi-compiler binary.
func findCompiler() (string, error) {
	// First, check PATH
	if path, err := exec.LookPath("kintsugi-compiler"); err == nil {
		return path, nil
	}

	// Check same directory as executable (dev mode)
	exePath, err := os.Executable()
	if err == nil {
		devCompiler := filepath.Join(filepath.Dir(exePath), "kintsugi-compiler")
		if _, err := os.Stat(devCompiler); err == nil {
			return devCompiler, nil
		}
	}

	// Check project bin directory (dev fallback)
	home, _ := os.UserHomeDir()
	if home != "" {
		devCompiler := filepath.Join(home, "Projects/kintsugi/bin/kintsugi-compiler")
		if _, err := os.Stat(devCompiler); err == nil {
			return devCompiler, nil
		}
	}

	return "", fmt.Errorf("kintsugi-compiler not found in PATH")
}

// runCompiler executes the compiler with the given root hash.
func runCompiler(compilerPath, rootHash, modpackPath string) error {
	compilerCmd := exec.Command(compilerPath, rootHash)
	compilerCmd.Stdout = os.Stdout
	compilerCmd.Stderr = os.Stderr
	compilerCmd.Env = append(os.Environ(),
		fmt.Sprintf("KINTSUGI_MODPACK_PATH=%s", modpackPath),
	)
	return compilerCmd.Run()
}

// registerModpack registers the built modpack in the Kintsugi database.
func registerModpack(cwd, rootHash string) error {
	// Read modpack metadata
	modpackJsonPath := filepath.Join(cwd, "modpack.json")
	data, err := os.ReadFile(modpackJsonPath)
	if err != nil {
		return fmt.Errorf("failed to read modpack.json: %w", err)
	}

	var mpMeta struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(data, &mpMeta); err != nil {
		return fmt.Errorf("failed to parse modpack.json: %w", err)
	}

	// Initialize config and store
	config, err := cli.NewConfig()
	if err != nil {
		return err
	}

	s, err := store.NewStore(config.RootDir)
	if err != nil {
		return fmt.Errorf("failed to initialize store: %w", err)
	}
	defer s.Close()

	// Find the full derivation name
	fullName := s.FindDerivationByHash(rootHash)
	if fullName == "" {
		return fmt.Errorf("built derivation %s not found in store", rootHash)
	}
	storePath := filepath.Join(s.StorePath(), fullName)

	// Register using ModpackManager
	modpackHash := rootHash
	if len(rootHash) >= 32 {
		modpackHash = rootHash[:32]
	}

	mgr := cli.NewModpackManager(config)
	if err := mgr.RegisterBuild(mpMeta.Name, modpackHash, storePath); err != nil {
		return err
	}

	fmt.Printf("Active build for '%s' is now registered.\n", mpMeta.Name)
	return nil
}
