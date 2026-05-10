import { getKintsugiRoot } from "../paths.ts";
import {
    addBuildToHistory,
    getActiveComposition,
    getBuildHistory,
    getModlistInfo,
    listModlists,
    removeModlist,
    switchActiveBuild,
} from "../store/modlist.ts";

export interface ModlistArgs {
    subcommand: string;
    subsubcommand?: string;
    name?: string;
    hash?: string;
    steps?: number;
    root?: string;
}

export function parseModlistArgs(args: string[] = Deno.args.slice(2)): ModlistArgs {
    const rootIndex = args.indexOf("--root");
    let root: string | undefined;
    if (rootIndex !== -1) {
        root = args[rootIndex + 1];
    }

    const filteredArgs = args.filter((arg, i) =>
        arg !== "--root" && (rootIndex === -1 || i !== rootIndex + 1)
    );

    const subcommand = filteredArgs[0];

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

    if (subcommand === "build") {
        const subsubcommand = filteredArgs[1];
        if (subsubcommand === "list" || subsubcommand === "ls") {
            return {
                subcommand,
                subsubcommand,
                name: filteredArgs[2],
                root,
            };
        }
        if (subsubcommand === "rollback") {
            return {
                subcommand,
                subsubcommand,
                name: filteredArgs[2],
                steps: filteredArgs[3] ? parseInt(filteredArgs[3]) : 1,
                root,
            };
        }
        if (subsubcommand === "switch") {
            return {
                subcommand,
                subsubcommand,
                name: filteredArgs[2],
                hash: filteredArgs[3],
                root,
            };
        }
    }

    return { subcommand: "help" };
}

export async function modlistCommand(modlistArgs?: ModlistArgs): Promise<void> {
    if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
        printModlistHelp();
        return;
    }

    const args = modlistArgs || parseModlistArgs();
    const root = args.root || getKintsugiRoot();

    switch (args.subcommand) {
        case "remove":
        case "rm": {
            if (!args.name) {
                throw new Error("name is required for 'remove'");
            }
            console.log(`Removing modlist '${args.name}'...`);
            await removeModlist(root, args.name);
            console.log(`Modlist '${args.name}' removed successfully`);
            break;
        }

        case "list":
        case "ls": {
            const modlists = await listModlists(root);
            if (modlists.length === 0) {
                console.log("No modlists found");
            } else {
                console.log("Modlists:");
                for (const modlist of modlists) {
                    console.log(`  - ${modlist}`);
                }
            }
            break;
        }

        case "info": {
            if (!args.name) {
                throw new Error("name is required for 'info'");
            }
            const info = await getModlistInfo(root, args.name);
            if (!info) {
                throw new Error(`Modlist '${args.name}' not found or invalid`);
            }
            const active = await getActiveComposition(root, args.name);

            console.log(`Modlist: ${info.name}`);
            console.log(`Version: ${info.version || "N/A"}`);
            console.log(`Environment: ${info.environment?.type || "N/A"}`);
            console.log(`Active Composition: ${active || "None"}`);
            break;
        }

        case "build": {
            if (!args.name) {
                throw new Error("modlist name is required for 'build' commands");
            }

            switch (args.subsubcommand) {
                case "list":
                case "ls": {
                    const history = await getBuildHistory(root, args.name);
                    const active = await getActiveComposition(root, args.name);

                    if (history.length === 0) {
                        console.log(`No build history found for '${args.name}'`);
                    } else {
                        console.log(`Build history for '${args.name}':`);
                        for (let i = history.length - 1; i >= 0; i--) {
                            const entry = history[i];
                            const isActive = entry.hash === active;
                            console.log(
                                `${isActive ? "*" : " "} [${i}] ${entry.hash} (${entry.timestamp})`,
                            );
                        }
                    }
                    break;
                }

                case "rollback": {
                    const history = await getBuildHistory(root, args.name);
                    const active = await getActiveComposition(root, args.name);
                    const currentIndex = history.findIndex((h) => h.hash === active);

                    if (currentIndex === -1) {
                        throw new Error(`Current active build for '${args.name}' not found in history`);
                    }

                    const targetIndex = currentIndex - (args.steps || 1);
                    if (targetIndex < 0) {
                        throw new Error("Cannot rollback: no more history");
                    }

                    const targetHash = history[targetIndex].hash;
                    console.log(`Rolling back '${args.name}' to ${targetHash}...`);
                    await switchActiveBuild(root, args.name, targetHash);
                    console.log(`Successfully rolled back to build ${targetIndex}`);
                    break;
                }

                case "switch": {
                    if (!args.hash) {
                        throw new Error("hash is required for 'switch'");
                    }
                    console.log(`Switching '${args.name}' to build ${args.hash}...`);
                    await switchActiveBuild(root, args.name, args.hash);
                    console.log(`Successfully switched to build ${args.hash}`);
                    break;
                }

                default:
                    console.log(`Unknown build subcommand: ${args.subsubcommand}`);
                    break;
            }
            break;
        }

        case "help":
            printModlistHelp();
            break;

        default:
            console.log(`Unknown subcommand: ${args.subcommand}`);
            console.log("Use 'kintsugi modlist --help' for usage information");
            break;
    }
}

function printModlistHelp() {
    console.log(`
Kintsugi Modlist

Usage:
  kintsugi modlist <command> [options]

Commands:
  remove <name>                 Remove a built modlist
  list                          List all built modlists
  info <name>                   Show modlist metadata
  build list <name>             List build history
  build rollback <name> [steps] Rollback to a previous build
  build switch <name> <hash>    Switch to a specific build hash

Options:
  --root <dir>         Kintsugi root directory (default: ~/.kintsugi)
  --help, -h          Show this help message

Examples:
  kintsugi modlist list
  kintsugi modlist info skyrim
  kintsugi modlist build list skyrim
  kintsugi modlist build rollback skyrim
`);
}
