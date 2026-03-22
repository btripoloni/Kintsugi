import { parseRunArgs, type RunArgs, runModlist } from "./commands/run.ts";
import { type CompileArgs, compileCommand, parseCompileArgs } from "./commands/compile.ts";
import { type InitArgs, initCommand, parseInitArgs } from "./commands/init.ts";

const args = Deno.args;
const command = args[0];
const showHelp = args.includes("--help") || args.includes("-h");

async function runCommandDirect(command: string, commandArgs: string[]): Promise<number> {
    try {
        if (command === "run") {
            const runArgs: RunArgs = parseRunArgs(commandArgs);
            console.log(`Running modlist '${runArgs.modlist}' with profile '${runArgs.profile}'...`);
            await runModlist(runArgs);
            return 0;
        } else if (command === "compile") {
            const compileArgs: CompileArgs = parseCompileArgs(commandArgs);
            console.log(`Compiling recipe '${compileArgs.recipeName}'...`);
            await compileCommand(compileArgs);
            return 0;
        } else if (command === "init") {
            const initArgs: InitArgs = parseInitArgs(commandArgs);
            console.log(`Initializing modlist '${initArgs.name}'...`);
            await initCommand(initArgs);
            return 0;
        } else {
            console.error(`Unknown command: ${command}`);
            return 1;
        }
    } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
        return 1;
    }
}

function printHelp() {
    console.log(`
Kintsugi

Usage:
  kintsugi <command> [options]

Commands:
  compile Compile a recipe into a composition
  init   Initialize a new modlist
  run    Run a modlist

Options:
  --help, -h Show this help message

Examples:
  kintsugi compile myrecipe --store store --modlist ./modlist
  kintsugi run skyrim default
`);
}

async function main() {
    if (!command || command === "--help" || command === "-h") {
        printHelp();
        Deno.exit(0);
    }

    if (command === "run" && showHelp) {
        console.log(`
Kintsugi Run

Usage:
  kintsugi run <modlist-name> [profile] [--root <kintsugi-root>]

Arguments:
  modlist-name     Name of the modlist to run
  profile          Execution profile (default: default)
  --root           Kintsugi root directory (default: .kintsugi)
  --help, -h       Show this help message

Examples:
  kintsugi run skyrim default
  kintsugi run skyrim editor
  kintsugi run skyrim --root ~/.kintsugi
`);
        Deno.exit(0);
    }

    if (command === "compile" && showHelp) {
        console.log(`
Kintsugi Compile

Usage:
  kintsugi compile <recipe-name> --store <store-dir> --modlist <modlist-dir> --output <output-dir>

Options:
  --store <dir>   Store directory (default: store)
  --modlist <dir> Modlist root directory (default: .)
  --output <dir>  Output directory (default: output)
  --help, -h      Show this help message
`);
        Deno.exit(0);
    }

    if (command === "init" && showHelp) {
        console.log(`
Kintsugi Init

Usage:
  kintsugi init <name> [--force]

Arguments:
  name         Modlist name (required)

Options:
  --force, -f  Overwrite existing files
  --help, -h   Show this help message
`);
        Deno.exit(0);
    }

    const exitCode = await runCommandDirect(command, args.slice(1));
    Deno.exit(exitCode);
}

main();
