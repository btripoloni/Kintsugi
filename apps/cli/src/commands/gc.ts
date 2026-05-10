import { join } from "jsr:@std/path";
import { exists } from "jsr:@std/fs";
import { getKintsugiRoot } from "../paths.ts";
import { readRecipe } from "../store/store.ts";

export interface GcArgs {
    dryRun: boolean;
    root?: string;
}

export function parseGcArgs(args: string[]): GcArgs {
    const dryRun = args.includes("--dry-run");
    const rootIdx = args.indexOf("--root");
    const root = rootIdx !== -1 ? args[rootIdx + 1] : undefined;

    return { dryRun, root };
}

async function getReachableHashes(
    storeDir: string,
    recipesDir: string,
    roots: Set<string>,
): Promise<Set<string>> {
    const reachable = new Set<string>();
    const queue = Array.from(roots);

    while (queue.length > 0) {
        const hash = queue.shift()!;
        if (reachable.has(hash)) continue;

        reachable.add(hash);

        const recipe = await readRecipe(recipesDir, hash);
        if (!recipe) continue;

        // Add direct dependencies
        if (recipe._dependencyHashes) {
            for (const depHash of recipe._dependencyHashes) {
                if (!reachable.has(depHash)) {
                    queue.push(depHash);
                }
            }
        }

        // Add layers if it's a composition
        if (recipe.src && recipe.src.type === "composition" && recipe.src.layers) {
            for (const layer of recipe.src.layers) {
                if (typeof layer === "string" && !reachable.has(layer)) {
                    queue.push(layer);
                }
            }
        }
    }

    return reachable;
}

export async function gcCommand(args: GcArgs): Promise<void> {
    const root = getKintsugiRoot(args.root);
    const storeDir = join(root, "store");
    const recipesDir = join(storeDir, "recipes");
    const modlistsDir = join(root, "modlists");

    if (!(await exists(storeDir))) {
        console.log("Store directory does not exist. Nothing to do.");
        return;
    }

    const roots = new Set<string>();

    // 1. Identify roots from active modlists
    if (await exists(modlistsDir)) {
        for await (const entry of Deno.readDir(modlistsDir)) {
            if (!entry.isDirectory) continue;

            const activePath = join(modlistsDir, entry.name, "active");
            try {
                const activeTarget = await Deno.readLink(activePath);
                // The link points to store/[hash]. We want just the [hash].
                const hash = activeTarget.split(/[\\/]/).pop();
                if (hash) {
                    roots.add(hash);
                }
            } catch {
                // Ignore if active link doesn't exist or is not a link
            }
        }
    }

    if (roots.size === 0) {
        console.log("No active modlists found. All shards are potentially eligible for deletion.");
    } else {
        console.log(`Found ${roots.size} root shards from active modlists.`);
    }

    // 2. Mark Phase
    const reachable = await getReachableHashes(storeDir, recipesDir, roots);
    console.log(`Identified ${reachable.size} reachable shards.`);

    // 3. Sweep Phase
    let deletedShards = 0;
    let deletedRecipes = 0;

    // Cleanup Shards
    for await (const entry of Deno.readDir(storeDir)) {
        if (!entry.isDirectory || entry.name === "recipes") continue;

        if (!reachable.has(entry.name)) {
            if (args.dryRun) {
                console.log(`[DRY RUN] Would delete shard: ${entry.name}`);
            } else {
                await Deno.remove(join(storeDir, entry.name), { recursive: true });
                console.log(`Deleted shard: ${entry.name}`);
            }
            deletedShards++;
        }
    }

    // Cleanup Recipes
    if (await exists(recipesDir)) {
        for await (const entry of Deno.readDir(recipesDir)) {
            if (!entry.isFile || !entry.name.endsWith(".json")) continue;

            const hash = entry.name.replace(".json", "");
            if (!reachable.has(hash)) {
                if (args.dryRun) {
                    console.log(`[DRY RUN] Would delete recipe: ${entry.name}`);
                } else {
                    await Deno.remove(join(recipesDir, entry.name));
                    console.log(`Deleted recipe: ${entry.name}`);
                }
                deletedRecipes++;
            }
        }
    }

    if (args.dryRun) {
        console.log(`Summary: ${deletedShards} shards and ${deletedRecipes} recipes would be deleted.`);
    } else {
        console.log(`Summary: ${deletedShards} shards and ${deletedRecipes} recipes deleted.`);
    }
}
