package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"kintsugi/internal/interpreter"
	"kintsugi/internal/store"

	"github.com/spf13/cobra"
)

var BuildCmd = &cobra.Command{
	Use:   "build",
	Short: "Build the current modpack",
	Run: func(cmd *cobra.Command, args []string) {
		cwd, err := os.Getwd()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting CWD: %v\n", err)
			os.Exit(1)
		}

		// Check for main.ts
		mainTsPath := filepath.Join(cwd, "main.ts")
		if _, err := os.Stat(mainTsPath); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "main.ts not found in %s\n", cwd)
			os.Exit(1)
		}

		fmt.Println("Building modpack...")

		home, _ := os.UserHomeDir()

		interpreterPath, err := interpreter.EnsureInterpreter()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to ensure interpreter: %v\n", err)
			os.Exit(1)
		}

		denoBin, err := interpreter.EnsureDeno()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to ensure Deno: %v\n", err)
			os.Exit(1)
		}

		// Create explicit Import Map
		// We map "kintsugi/" -> interpreterDir/
		// interpreterPath is ".../mod.ts", so dir is Dir(interpreterPath)
		interpreterDir := filepath.Dir(interpreterPath)

		// Use a file URL for the import map target
		interpreterDirUrl := fmt.Sprintf("file://%s/", interpreterDir)

		importMap := map[string]interface{}{
			"imports": map[string]string{
				"kintsugi/": interpreterDirUrl,
			},
		}

		importMapData, err := json.Marshal(importMap)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create import map: %v\n", err)
			os.Exit(1)
		}

		// Write import map to a temp file
		tmpFile, err := os.CreateTemp("", "kintsugi_import_map_*.json")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create temp import map: %v\n", err)
			os.Exit(1)
		}
		defer os.Remove(tmpFile.Name()) // Clean up

		if _, err := tmpFile.Write(importMapData); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to write import map: %v\n", err)
			os.Exit(1)
		}
		if err := tmpFile.Close(); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to close import map file: %v\n", err)
			os.Exit(1)
		}

		denoCmd := exec.Command(denoBin, "run", "--allow-read", "--allow-write", "--allow-env", "--import-map", tmpFile.Name(), interpreterPath, cwd)
		output, err := denoCmd.Output()
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				fmt.Fprintf(os.Stderr, "Interpreter failed: %v\nStderr: %s\n", err, exitErr.Stderr)
			} else {
				fmt.Fprintf(os.Stderr, "Interpreter failed: %v\n", err)
			}
			os.Exit(1)
		}

		rootHash := strings.TrimSpace(string(output))
		fmt.Printf("Interpreter success. Root Hash: %s\n", rootHash)

		// Locate compiler
		compilerBinPath, err := exec.LookPath("kintsugi-compiler")
		if err != nil {
			// Fallback: Check if it is in the same directory as the executable (dev mode support)
			exePath, err := os.Executable()
			if err == nil {
				devCompiler := filepath.Join(filepath.Dir(exePath), "kintsugi-compiler")
				if _, err := os.Stat(devCompiler); err == nil {
					compilerBinPath = devCompiler
				} else {
					// Another fallback: check project bin
					devCompiler2 := filepath.Join(home, "Projects/kintsugi/bin/kintsugi-compiler")
					if _, err := os.Stat(devCompiler2); err == nil {
						compilerBinPath = devCompiler2
					}
				}
			}

			if compilerBinPath == "" {
				fmt.Fprintf(os.Stderr, "kintsugi-compiler not found in PATH\n")
				os.Exit(1)
			}
		}

		fmt.Printf("Running compiler: %s %s\n", compilerBinPath, rootHash)
		compilerCmd := exec.Command(compilerBinPath, rootHash)
		compilerCmd.Stdout = os.Stdout
		compilerCmd.Stderr = os.Stderr
		compilerCmd.Env = os.Environ()

		if err := compilerCmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Compiler failed: %v\n", err)
			os.Exit(1)
		}

		fmt.Println("Build complete.")

		// Update active modpack in DB
		// Read name from modpack.json
		modpackJsonPath := filepath.Join(cwd, "modpack.json")
		data, err := os.ReadFile(modpackJsonPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to read modpack.json: %v\n", err)
			return // Don't exit, build was successful
		}

		var mpMeta struct {
			Name string `json:"name"`
		}
		if err := json.Unmarshal(data, &mpMeta); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to parse modpack.json: %v\n", err)
			return
		}

		// Create Symlinks
		modpackHash := rootHash
		if len(rootHash) >= 32 {
			modpackHash = rootHash[:32]
		}

		entries, _ := os.ReadDir(cwd)
		maxGen := 0
		suffix := fmt.Sprintf("-%s-gen-", mpMeta.Name)

		for _, entry := range entries {
			name := entry.Name()
			if strings.Contains(name, suffix) {
				parts := strings.Split(name, suffix)
				if len(parts) == 2 {
					if num, err := strconv.Atoi(parts[1]); err == nil {
						if num > maxGen {
							maxGen = num
						}
					}
				}
			}
		}

		nextGen := maxGen + 1
		linkName := fmt.Sprintf("%s-%s-gen-%d", modpackHash, mpMeta.Name, nextGen)

		// Create store instance to find the folder name
		s, err := store.NewStore(filepath.Join(home, ".kintsugi"))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to initialize store: %v\n", err)
			return
		}

		fullName := s.FindDerivationByHash(rootHash)
		if fullName == "" {
			fmt.Fprintf(os.Stderr, "Built derivation %s not found in store\n", rootHash)
			return
		}
		storePath := filepath.Join(s.StorePath(), fullName)

		// Create gen symlink
		if err := os.Symlink(storePath, filepath.Join(cwd, linkName)); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create gen symlink: %v\n", err)
		} else {
			fmt.Printf("Created symlink: %s\n", linkName)
		}

		// Create/Update 'current build'
		currentLink := filepath.Join(cwd, "current build")
		os.Remove(currentLink) // Remove existing
		if err := os.Symlink(linkName, currentLink); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create current build symlink: %v\n", err)
		} else {
			fmt.Printf("Created symlink: current build -> %s\n", linkName)
		}

		// Register modpack in ~/.kintsugi/modpacks for GC to recognize
		registeredModpackDir := filepath.Join(home, ".kintsugi", "modpacks", mpMeta.Name)
		if err := os.MkdirAll(registeredModpackDir, 0755); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create registered modpack dir: %v\n", err)
		} else {
			// Create symlinks in registered dir pointing to local build symlinks
			registeredGenLink := filepath.Join(registeredModpackDir, linkName)
			os.Remove(registeredGenLink) // Remove if exists
			if err := os.Symlink(storePath, registeredGenLink); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to create registered gen symlink: %v\n", err)
			}

			registeredCurrentLink := filepath.Join(registeredModpackDir, "current build")
			os.Remove(registeredCurrentLink)
			if err := os.Symlink(linkName, registeredCurrentLink); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to create registered current build symlink: %v\n", err)
			}
		}

		fmt.Printf("Active build for '%s' is now: %s\n", mpMeta.Name, linkName)
	},
}
