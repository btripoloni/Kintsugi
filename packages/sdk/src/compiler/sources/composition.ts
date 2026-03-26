import { join } from "jsr:@std/path";
import type { Composition, CompositionLayer } from "../types/fetchers.ts";
import type { SourceContext } from "./local.ts";

const STORE_DIR = "store";

function getLayerString(layer: string | CompositionLayer): string {
    return typeof layer === "string" ? layer : layer.out || "";
}

export async function executeComposition(
    fetcher: Composition,
    ctx: SourceContext,
): Promise<void> {
    await Deno.mkdir(ctx.outputDir, { recursive: true });

    for (const layer of fetcher.layers) {
        const layerName = getLayerString(layer);
        if (!layerName) continue;

        const layerPath = join(ctx.modlistRoot, STORE_DIR, layerName);

        try {
            const entries = await Deno.readDir(layerPath);

            for await (const entry of entries) {
                const srcPath = join(layerPath, entry.name);
                const destPath = join(ctx.outputDir, entry.name);

                if (entry.isFile) {
                    try {
                        await Deno.link(srcPath, destPath);
                    } catch (err) {
                        if (err instanceof Deno.errors.AlreadyExists) {
                            await Deno.remove(destPath);
                            await Deno.link(srcPath, destPath);
                        } else {
                            throw err;
                        }
                    }
                } else if (entry.isDirectory) {
                    await copyDirAsLinks(srcPath, destPath);
                }
            }
        } catch (err) {
            if (err instanceof Deno.errors.NotFound) {
                continue;
            }
            throw err;
        }
    }
}

async function copyDirAsLinks(srcDir: string, destDir: string): Promise<void> {
    await Deno.mkdir(destDir, { recursive: true });

    const entries = await Deno.readDir(srcDir);

    for await (const entry of entries) {
        const srcPath = join(srcDir, entry.name);
        const destPath = join(destDir, entry.name);

        if (entry.isFile) {
            try {
                await Deno.link(srcPath, destPath);
            } catch (err) {
                if (err instanceof Deno.errors.AlreadyExists) {
                    await Deno.remove(destPath);
                    await Deno.link(srcPath, destPath);
                } else {
                    throw err;
                }
            }
        } else if (entry.isDirectory) {
            await copyDirAsLinks(srcPath, destPath);
        }
    }
}

export function getCompositionDeps(fetcher: Composition): string[] {
    return fetcher.layers
        .map(getLayerString)
        .filter((l): l is string => !!l);
}
