package interpreter

import (
	_ "embed"

	"kintsugi/internal/interpreter/utils"
)

//go:embed runner.ts
var runnerScript []byte

const denoVersion = "v1.46.0"
const kintsugiPackageVersion = "0.1.0"

// GetKintsugiPackageVersion returns the version of the kintsugi JSR package to use.
func GetKintsugiPackageVersion() string {
	return kintsugiPackageVersion
}

// GetRunnerScript returns the embedded runner script content.
func GetRunnerScript() []byte {
	return runnerScript
}

// EnsureDeno checks for Deno in PATH or ~/.kintsugi/bin/deno.
// If not found, it downloads and installs it.
// Returns the path to the Deno executable.
func EnsureDeno() (string, error) {
	return utils.EnsureDeno(denoVersion)
}
