import { join } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs";
import type { Derivation } from "./types/derivation.ts";
import { resolveTransitiveLayers } from "./lib/modpack.ts";
import { hashDerivation } from "./lib/hash.ts";
import { saveRecipe } from "../../compiler/src/store/store.ts";
import type { Recipe } from "../../compiler/src/types/recipe.ts";

export interface InterpretationResult {
    derivations: Derivation[];
    rootOut: string;
}

export interface InterpretDerivationOptions {
    derivation: Derivation;
    recipesDir?: string;
}

export async function interpretDerivation(
    options: InterpretDerivationOptions,
): Promise<InterpretationResult> {
    const { derivation, recipesDir } = options;

    if (!derivation.name || !derivation.version || !derivation.src) {
        throw new Error("Invalid derivation: name, version, and src are required");
    }

    let derivations: Derivation[];

    const src = derivation.src;
    if (src.type === "composition") {
        const layerObjects = src.layers.filter(
            (layer): layer is { name: string; version: string; src: any } =>
                typeof layer !== "string" && "name" in layer && "version" in layer
        );

        if (layerObjects.length > 0) {
            derivations = resolveTransitiveLayers([derivation, ...layerObjects as any]);
        } else {
            derivations = [derivation];
        }
    } else {
        derivations = [derivation];
    }

    const hashedDerivations: Derivation[] = [];
    for (const drv of derivations) {
        const hashed = await hashDerivation(drv, recipesDir);
        hashedDerivations.push(hashed);
    }

    const hashedMap = new Map(
        hashedDerivations.map((d) => [d.name + "-" + d.version, d.out])
    );

    const finalDerivations: Derivation[] = [];
    for (const drv of hashedDerivations) {
        const deps = drv.deps?.map((d) => {
            const key = d.name + "-" + d.version;
            return hashedMap.get(key) || d.out || key;
        }) || [];

        let finalSrc = drv.src;
        if (finalSrc.type === "composition") {
            finalSrc = {
                ...finalSrc,
                layers: finalSrc.layers.map((l) =>
                    typeof l === "string" ? l : (l as any).out || ""
                ).filter((l): l is string => !!l),
            };
        }

        const finalDrv: Derivation = {
            ...drv,
            src: finalSrc,
            dependencies: deps,
            deps: undefined,
        };

        finalDerivations.push(finalDrv);
    }

    if (recipesDir) {
        const recipesDirPath = join(recipesDir, "recipes");
        await ensureDir(recipesDirPath);

        for (const drv of finalDerivations) {
            let srcForRecipe = drv.src;
            if (srcForRecipe.type === "composition") {
                srcForRecipe = {
                    ...srcForRecipe,
                    layers: srcForRecipe.layers.map((l) =>
                        typeof l === "string" ? l : l.out || ""
                    ).filter((l): l is string => !!l),
                };
            }

            const recipe: Recipe = {
                out: drv.out!,
                src: srcForRecipe as any,
                dependencies: drv.dependencies,
            };

            await saveRecipe(recipesDirPath, drv.out!, recipe);
        }
    }

    const rootOut = finalDerivations.find(
        (d) => d.name === derivation.name && d.version === derivation.version
    )?.out || finalDerivations[finalDerivations.length - 1].out!;

    return {
        derivations: finalDerivations,
        rootOut,
    };
}

export async function interpretModlist(
    modlistPath: string,
    recipesDir?: string,
): Promise<InterpretationResult> {
    const mainTsPath = join(modlistPath, "main.ts");

    const mainModule = await import(`file://${mainTsPath}`);

    const derivation = mainModule.default as Derivation;

    if (!derivation.name || !derivation.version || !derivation.src) {
        throw new Error("Invalid derivation: name, version, and src are required");
    }

    return interpretDerivation({ derivation, recipesDir });
}