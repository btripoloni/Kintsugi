import { getKintsugiRoot } from "../paths.ts";
import { addVase, getVaseMetadata, listVases, removeVase } from "../store/vase.ts";

export interface VaseArgs {
    subcommand: string;
    name?: string;
    sourcePath?: string;
    root?: string;
}

export function parseVaseArgs(args: string[] = Deno.args.slice(2)): VaseArgs {
    const rootIndex = args.indexOf("--root");
    let root: string | undefined;
    if (rootIndex !== -1) {
        root = args[rootIndex + 1];
    }

    const filteredArgs = args.filter((arg) => arg !== "--root");

    const subcommand = filteredArgs[0];

    if (subcommand === "add") {
        return {
            subcommand,
            name: filteredArgs[1],
            sourcePath: filteredArgs[2],
            root,
        };
    }

    if (subcommand === "remove" || subcommand === "rm") {
        return {
            subcommand,
            name: filteredArgs[1],
            root,
        };
    }

    if (subcommand === "list" || subcommand === "ls") {
        return {
            subcommand,
            root,
        };
    }

    if (subcommand === "info") {
        return {
            subcommand,
            name: filteredArgs[1],
            root,
        };
    }

    return { subcommand: "help" };
}

export async function vaseCommand(vaseArgs?: VaseArgs): Promise<void> {
    if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
        console.log(`
Kintsugi Vase

Usage:
  kintsugi vase <command> [options]

Commands:
  add <name> <path>    Add a new vase from a directory
  remove <name>        Remove a vase
  list                 List all vases
  info <name>          Show vase metadata

Options:
  --root <dir>         Kintsugi root directory (default: ~/.kintsugi)
  --help, -h          Show this help message

Examples:
  kintsugi vase add skyrim /path/to/game
  kintsugi vase list
  kintsugi vase remove skyrim-1
  kintsugi vase info skyrim-1
`);
        return;
    }

    const args = vaseArgs || parseVaseArgs();
    const root = args.root || getKintsugiRoot();

    switch (args.subcommand) {
        case "add": {
            if (!args.name || !args.sourcePath) {
                throw new Error("name and path are required for 'add'");
            }
            console.log(`Adding vase '${args.name}' from '${args.sourcePath}'...`);
            await addVase(root, args.name, args.sourcePath);
            console.log(`Vase '${args.name}' created successfully`);
            break;
        }

        case "remove":
        case "rm": {
            if (!args.name) {
                throw new Error("name is required for 'remove'");
            }
            console.log(`Removing vase '${args.name}'...`);
            await removeVase(root, args.name);
            console.log(`Vase '${args.name}' removed successfully`);
            break;
        }

        case "list":
        case "ls": {
            const vases = await listVases(root);
            if (vases.length === 0) {
                console.log("No vases found");
            } else {
                console.log("Vases:");
                for (const vase of vases) {
                    console.log(`  - ${vase}`);
                }
            }
            break;
        }

        case "info": {
            if (!args.name) {
                throw new Error("name is required for 'info'");
            }
            const metadata = await getVaseMetadata(root, args.name);
            if (!metadata) {
                throw new Error(`Vase '${args.name}' not found`);
            }
            console.log(`Vase: ${metadata.name}`);
            console.log(`Created: ${metadata.addedAt}`);
            console.log(`Source: ${metadata.path}`);
            break;
        }

        default:
            console.log(`Unknown subcommand: ${args.subcommand}`);
            console.log("Use 'kintsugi vase --help' for usage information");
            break;
    }
}
