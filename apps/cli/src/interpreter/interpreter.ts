import { join } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs";
import type { Shard } from "@btripoloni/kintsugi";
import { hashShard, resolveTransitiveLayers } from "@btripoloni/kintsugi";
import type { Recipe } from "../lib/recipe.ts";
import { saveRecipe } from "../store/store.ts";

export interface InterpretationResult {
    shards: Shard[];
    rootOut: string;
}

export interface InterpretShardOptions {
    shard: Shard;
    recipesDir?: string;
}

export async function interpretShard(
    options: InterpretShardOptions,
): Promise<InterpretationResult> {
    const { shard, recipesDir } = options;

    if (!shard.name || !shard.version || !shard.src) {
        throw new Error("Invalid shard: name, version, and src are required");
    }

    let shards: Shard[];

    const src = shard.src;
    if (src.type === "composition") {
        const layerObjects = src.layers.filter(
            (layer): layer is { name: string; version: string; src: any } =>
                typeof layer !== "string" && "name" in layer && "version" in layer,
        );

        if (layerObjects.length > 0) {
            shards = resolveTransitiveLayers([shard, ...layerObjects as any]);
        } else if (shard.dependencies && shard.dependencies.length > 0) {
            // Layers are strings (hashes) - use dependencies to get full shard objects
            shards = resolveTransitiveLayers([shard, ...shard.dependencies]);
        } else {
            shards = [shard];
        }
    } else {
        shards = [shard];
    }

    // Shards from compose() already have `out` computed - preserve them
    // Only hash shards that don't have `out` yet (direct Shard without compose)
    const hashedShards: Shard[] = [];
    for (const drv of shards) {
        if (drv.out) {
            hashedShards.push(drv);
        } else {
            const hashed = await hashShard(drv);
            hashedShards.push(hashed);
        }
    }

    const hashedMap = new Map(
        hashedShards.map((d) => [d.name + "-" + d.version, d.out]),
    );

    const finalShards: Shard[] = [];
    for (const drv of hashedShards) {
        const dependencyHashes = drv.dependencies?.map((d) => {
            const key = d.name + "-" + d.version;
            return hashedMap.get(key) || d.out || key;
        }) || [];

        let finalSrc = drv.src;
        if (finalSrc.type === "composition") {
            finalSrc = {
                ...finalSrc,
                layers: finalSrc.layers.map((l) => typeof l === "string" ? l : (l as any).out || "")
                    .filter((l): l is string => !!l),
            };
        }

        const finalDrv: Shard = {
            ...drv,
            src: finalSrc,
            _dependencyHashes: dependencyHashes,
        };

        finalShards.push(finalDrv);
    }

    if (recipesDir) {
        await ensureDir(recipesDir);

        for (const drv of finalShards) {
            let srcForRecipe = drv.src;
            if (srcForRecipe.type === "composition") {
                srcForRecipe = {
                    ...srcForRecipe,
                    layers: srcForRecipe.layers.map((l) => typeof l === "string" ? l : l.out || "")
                        .filter((l): l is string => !!l),
                };
            }

            const recipe: Recipe = {
                out: drv.out!,
                src: srcForRecipe as any,
                _dependencyHashes: drv._dependencyHashes,
                postbuild: drv.postbuild,
            };

            await saveRecipe(recipesDir, drv.out!, recipe);
        }
    }

    const rootOut = finalShards.find(
        (d) => d.name === shard.name && d.version === shard.version,
    )?.out || finalShards[finalShards.length - 1].out!;

    return {
        shards: finalShards,
        rootOut,
    };
}

export async function interpretModlist(
    modlistPath: string,
    recipesDir?: string,
): Promise<InterpretationResult> {
    const mainTsPath = join(modlistPath, "main.ts");

    const mainModule = await import(`file://${mainTsPath}`);

    const shard = mainModule.default as Shard;

    if (!shard.name || !shard.version || !shard.src) {
        throw new Error("Invalid shard: name, version, and src are required");
    }

    return interpretShard({ shard, recipesDir });
}
