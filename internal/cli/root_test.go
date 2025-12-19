package cli

import (
	"bytes"
	"strings"
	"testing"
)

func TestRootCommand(t *testing.T) {
	// Capture output
	buf := new(bytes.Buffer)
	rootCmd.SetOut(buf)
	rootCmd.SetErr(buf)

	// Simulate "composer --help"
	rootCmd.SetArgs([]string{"--help"})

	err := rootCmd.Execute()
	if err != nil {
		t.Fatalf("rootCmd execution failed: %v", err)
	}

	output := buf.String()
	expected := "ModManager is the core engine of the Mod Manager"
	if !strings.Contains(output, expected) {
		t.Errorf("Expected output to contain %q, but got:\n%s", expected, output)
	}
}

func TestRootCommandName(t *testing.T) {
	if rootCmd.Use != "modmanager" {
		t.Errorf("Expected command name 'modmanager', got %q", rootCmd.Use)
	}
}
