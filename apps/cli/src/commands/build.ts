import { join } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs";
import { interpretModlist } from "../interpreter/interpreter.ts";
import { recipeExists, saveRecipe } from "../store/store.ts";
import { getKintsugiRoot } from "../paths.ts";
import { executeUrl, executeLocal, executeComposition, executeVase } from "../sources/index.ts";
import type { Fetcher } from "@btripoloni/kintsugi";

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
        modlistPath = join(root, "modlists", name);
    }

    return { modlistPath, root };
}

async function executeSource(
    fetcher: Fetcher,
    modlistRoot: string,
    storeDir: string,
): Promise<void> {
    const ctx = { modlistRoot, outputDir: storeDir };

    switch (fetcher.type) {
        case "local":
            await executeLocal(fetcher as any, ctx);
            break;
        case "url":
            await executeUrl(fetcher as any, ctx);
            break;
        case "composition":
            await executeComposition(fetcher as any, ctx);
            break;
        case "write_json":
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
): Promise<void> {
    const exists = await recipeExists(storeDir, out);
    if (exists) {
        console.log(`Shard ${out} already exists in store, skipping build`);
        return;
    }

    const shardDir = join(storeDir, "shards", out);
    await ensureDir(shardDir);

    try {
        await executeSource(src, modlistPath, shardDir);
    } catch (e) {
        console.warn(
            `Warning: Failed to fetch source for ${out}: ${e instanceof Error ? e.message : e}`,
        );
    }

    const recipe = {
        out,
        src,
    };

    await saveRecipe(storeDir, out, recipe);
    console.log(`Created shard ${out}`);
}

async function buildComposition(
    out: string,
    layers: string[],
    storeDir: string,
): Promise<void> {
    const compositionDir = join(storeDir, "compositions", out);
    await ensureDir(compositionDir);

    for (const layer of layers) {
        const shardDir = join(storeDir, "shards", layer);
        const linkPath = join(compositionDir, layer);
        try {
            await Deno.symlink(shardDir, linkPath);
        } catch (e) {
            if (!(e instanceof Deno.errors.AlreadyExists)) {
                throw e;
            }
        }
    }

    const kintsugiDir = join(compositionDir, "kintsugi", "exec");
    await ensureDir(kintsugiDir);

    const runJsonPath = join(kintsugiDir, "default.run.json");
    const runJson = {
        entrypoint: "/bin/sh",
        args: ["-c", "echo 'No run configured'"],
    };
    await Deno.writeTextFile(runJsonPath, JSON.stringify(runJson, null, 2));

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

    const args = buildArgs || parseBuildArgs();

    const modlistPath = args.modlistPath;
    const storeDir = join(args.root, "store");

    await ensureDir(storeDir);
    await ensureDir(join(storeDir, "recipes"));
    await ensureDir(join(storeDir, "shards"));
    await ensureDir(join(storeDir, "compositions"));

    const modlistName = modlistPath.split("/").pop() || "unknown";
    console.log(`Building modlist '${modlistName}'...`);

    const result = await interpretModlist(modlistPath, storeDir);
    const derivations = result.derivations;
    const rootOut = result.rootOut;

    console.log(`Interpreted: ${rootOut} (${derivations.length} derivations)`);

    for (const drv of derivations) {
        const src = drv.src as Fetcher;
        if (src.type !== "composition") {
            await buildShard(drv.out!, src, modlistPath, storeDir);
        }
    }

    const rootDrv = derivations.find((d) => d.out === rootOut);
    const rootSrc = rootDrv?.src as Fetcher;

    if (rootSrc?.type === "composition") {
        const layerStrings = rootSrc.layers.filter((l): l is string => typeof l === "string");
        await buildComposition(rootOut, layerStrings, storeDir);
    } else {
        await buildComposition(rootOut, [rootOut], storeDir);
    }

    const targetModlistDir = join(args.root, "modlists", modlistName);
    await ensureDir(targetModlistDir);
    
    const activePath = join(targetModlistDir, "active");
    const compositionPath = join(storeDir, "compositions", rootOut);

    try {
        await Deno.remove(activePath);
    } catch {
        // Ignore if doesn't exist
    }

    await Deno.symlink(compositionPath, activePath);

    console.log(`Build complete. Active composition: ${rootOut}`);
}
