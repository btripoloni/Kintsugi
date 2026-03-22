import { runCommand } from "./commands/run.ts";
import { compileCommand } from "./commands/compile.ts";

async function main() {
  const command = Deno.args[0];

  if (command === "--help" || command === "-h") {
    console.log(`
Kintsugi

Usage:
  kintsugi <command> [options]

Commands:
  compile           Compile a recipe into a composition
  run               Run a modlist

Options:
  --help, -h        Show this help message

Examples:
  kintsugi compile myrecipe --store store --modlist ./modlist
  kintsugi run skyrim default
`);
    return;
  }

  if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
    const commandIndex = Deno.args.indexOf("--help") !== -1 
      ? Deno.args.indexOf("--help") 
      : Deno.args.indexOf("-h");
    Deno.args[commandIndex] = "-h";
  }

  switch (command) {
    case "run":
      await runCommand();
      break;
    case "compile":
      await compileCommand();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Run 'kintsugi --help' for usage information");
      Deno.exit(1);
  }
}

main();
