package commands

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var RootCmd = &cobra.Command{
	Use:   "kintsugi",
	Short: "Declarative Mod Manager",
}

func Execute() {
	if err := RootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	RootCmd.AddCommand(InitCmd)
	RootCmd.AddCommand(BuildCmd)
	RootCmd.AddCommand(RunCmd)
	RootCmd.AddCommand(gcCmd)
}
