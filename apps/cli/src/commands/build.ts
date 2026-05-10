import { dirname, join, relative } from "jsr:@std/path";
import { ensureDir, walk } from "jsr:@std/fs";
import { interpretModlist } from "../interpreter/interpreter.ts";
import { saveRecipe } from "../store/store.ts";
import { getKintsugiRoot } from "../paths.ts";
import {
    executeComposition,
    executeJson,
    executeLocal,
    executeNexus,
    executeRun,
    executeUrl,
    executeVase,
} from "../sources/index.ts";
import type {
    Composition,
    Fetcher,
    FetchLocal,
    FetchNexus,
    FetchUrl,
    FetchVase,
    WriteJson,
    WriteRun,
} from "@btripoloni/kintsugi";

export interface BuildArgs {
    modlistPath: string;
    root: string;
}

export function parseBuildArgs(args: string[] = Deno.args.slice(1)): BuildArgs {
    const rootIndex = args.indexOf("--root");
    const root = rootIndex !== -1 && rootIndex + 1 < args.length
        ? args[rootIndex + 1]
        : getKintsugiRoot();

    const filteredArgs = args.filter((arg) =>
        arg !== "--root" &&
        (rootIndex === -1 || args.indexOf(arg) !== rootIndex + 1)
    );
    const name = filteredArgs[0];

    const cwd = Deno.cwd();
    const mainTsPath = join(cwd, "main.ts");
    const modlistJsonPath = join(cwd, "modlist.json");

    let modlistPath: string;

    try {
        Deno.statSync(mainTsPath);
        Deno.statSync(modlistJsonPath);
        modlistPath = cwd;
    } catch {
        if (!name) {
            console.error("Usage: kintsugi build [--root <kintsugi-root>]");
            console.error("Or run from inside a modlist directory");
            Deno.exit(1);
        }
        modlistPath = name.startsWith("/") ? name : join(root, "modlists", name);
    }

    return { modlistPath, root };
}

import { addBuildToHistory } from "../store/modlist.ts";

async function executeSource(
    fetcher: Fetcher,
    modlistRoot: string,
    storeDir: string,
    root: string,
): Promise<void> {
    const ctx = { modlistRoot, outputDir: storeDir };

    switch (fetcher.type) {
        case "local":
            await executeLocal(fetcher as FetchLocal, ctx);
            break;
        case "url":
            await executeUrl(fetcher as FetchUrl, ctx);
            break;
        case "nexus":
            await executeNexus(fetcher as FetchNexus, { ...ctx, kintsugiRoot: root });
            break;
        case "composition":
            await executeComposition(fetcher as Composition, ctx);
            break;
        case "vase":
            await executeVase(fetcher as FetchVase, ctx, root);
            break;
        case "write_json":
            await executeJson(fetcher as WriteJson, ctx);
            break;
        case "write_run":
            await executeRun(fetcher as WriteRun, ctx);
            break;
        default:
            throw new Error(`Unknown source type: ${(fetcher as Fetcher).type}`);
    }
}

async function buildShard(
    out: string,
    src: Fetcher,
    modlistPath: string,
    storeDir: string,
    recipesDir: string,
    root: string,
    postbuild?: string,
): Promise<void> {
    const shardDir = join(storeDir, out);

    // Check if shard already exists in store (not just recipe)
    try {
        const stat = await Deno.stat(shardDir);
        if (stat.isDirectory) {
            console.log(`Shard ${out} already exists in store, skipping build`);
            return;
        }
    } catch {
        // Directory doesn't exist yet, proceed
    }

    await ensureDir(shardDir);

    await executeSource(src, modlistPath, shardDir, root);

    // Force kernel filesystem sync before running postbuild
    // This ensures all files are fully written to disk and not in cache
    const syncCmd = new Deno.Command("sync", {
        stdout: "null",
        stderr: "null",
        cwd: shardDir,
    });
    await syncCmd.output();

    // Wait for filesystem metadata to be consistent
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (postbuild) {
        console.log(`Executing postbuild script for ${out}`);
        const cmd = new Deno.Command("sh", {
            args: ["-c", postbuild],
            cwd: shardDir,
            stdout: "inherit",
            stderr: "inherit",
        });
        const status = await cmd.output();
        if (!status.success) {
            throw new Error(`Postbuild script failed for ${out}`);
        }

        // Sync again after postbuild makes changes
        await syncCmd.output();
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const recipe = {
        out,
        src,
        postbuild,
    };

    await saveRecipe(recipesDir, out, recipe);
    console.log(`Created shard ${out}`);
}

async function buildComposition(
    out: string,
    layers: string[],
    storeDir: string,
): Promise<void> {
    const compositionDir = join(storeDir, out);
    await ensureDir(compositionDir);

    for (const layer of layers) {
        const shardDir = join(storeDir, layer);

        try {
            for await (const entry of walk(shardDir)) {
                if (!entry.isFile) continue;

                const relPath = relative(shardDir, entry.path);
                const targetPath = join(compositionDir, relPath);

                await ensureDir(dirname(targetPath));

                try {
                    await Deno.remove(targetPath);
                } catch {
                    // File doesn't exist yet, which is fine
                }

                await Deno.link(entry.path, targetPath);
            }
        } catch (e) {
            console.warn(
                `Warning: failed to process layer ${layer}: ${e instanceof Error ? e.message : e}`,
            );
        }
    }

    // Collect kintsugi directories from all layers and merge them
    const kintsugiDir = join(compositionDir, "kintsugi");
    await ensureDir(kintsugiDir);

    for (const layer of layers) {
        const layerShardDir = join(storeDir, layer);
        const layerKintsugiDir = join(layerShardDir, "kintsugi");

        try {
            await Deno.stat(layerKintsugiDir);
        } catch {
            // Layer doesn't have kintsugi directory, skip
            continue;
        }

        try {
            for await (const entry of walk(layerKintsugiDir)) {
                if (!entry.isFile) continue;

                const relPath = relative(layerKintsugiDir, entry.path);
                const targetPath = join(kintsugiDir, relPath);

                await ensureDir(dirname(targetPath));

                try {
                    await Deno.remove(targetPath);
                } catch {
                    // File doesn't exist yet, which is fine
                }

                await Deno.link(entry.path, targetPath);
            }
        } catch (e) {
            console.warn(
                `Warning: failed to process kintsugi directory from layer ${layer}: ${
                    e instanceof Error ? e.message : e
                }`,
            );
        }
    }

    console.log(`Created composition ${out}`);
}

export async function buildCommand(buildArgs?: BuildArgs): Promise<void> {
    if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
        console.log(`
Kintsugi Build

Usage:
  kintsugi build [--root <kintsugi-root>]

Options:
  --root           Kintsugi root directory (default: ~/.kintsugi)
  --help, -h       Show this help message

Note: Run from inside a modlist directory, or provide <modlist-name>
`);
        return;
    }

    const { modlistPath, root } = buildArgs || parseBuildArgs();

    const storeDir = join(root, "store");
    const recipesDir = join(root, "recipes");

    await ensureDir(storeDir);
    await ensureDir(recipesDir);

    const modlistName = modlistPath.split("/").pop() || "unknown";
    console.log(`Building modlist '${modlistName}'...`);

    const result = await interpretModlist(modlistPath, recipesDir);
    const shards = result.shards;
    const rootOut = result.rootOut;

    console.log(`Interpreted: ${rootOut} (${shards.length} shards)`);

    for (const drv of shards) {
        const src = drv.src as Fetcher;
        if (src.type !== "composition") {
            await buildShard(drv.out!, src, modlistPath, storeDir, recipesDir, root, drv.postbuild);
        }
    }

    const rootDrv = shards.find((d) => d.out === rootOut);
    const rootSrc = rootDrv?.src as Fetcher;

    if (rootSrc?.type === "composition") {
        const layerStrings = rootSrc.layers.filter((l: string | { out?: string }) =>
            typeof l === "string"
        ) as string[];
        await buildComposition(rootOut, layerStrings, storeDir);
    } else {
        await buildComposition(rootOut, [rootOut], storeDir);
    }

    const targetModlistDir = join(root, "modlists", modlistName);
    await ensureDir(targetModlistDir);

    // Copy modlist.json to kintsugi directory
    const sourceModlistJson = join(modlistPath, "modlist.json");
    const targetModlistJson = join(targetModlistDir, "modlist.json");

    try {
        await Deno.copyFile(sourceModlistJson, targetModlistJson);
        console.log(`Copied modlist.json to ${targetModlistDir}`);
    } catch (e) {
        console.warn(`Warning: failed to copy modlist.json: ${e instanceof Error ? e.message : e}`);
    }

    const activePath = join(targetModlistDir, "active");
    const compositionPath = join(storeDir, rootOut);

    try {
        await Deno.remove(activePath);
    } catch {
        // Ignore if doesn't exist
    }

    await Deno.symlink(compositionPath, activePath);

    await addBuildToHistory(root, modlistName, rootOut);

    console.log(`Build complete. Active composition: ${rootOut}`);
}
