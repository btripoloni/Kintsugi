import { copy } from "jsr:@std/fs";
import { join } from "jsr:@std/path";
import type { Composition } from "@btripoloni/kintsugi";
import type { SourceContext } from "./types.ts";

export async function executeComposition(
    fetcher: Composition,
    ctx: SourceContext,
): Promise<void> {
    for (const layer of fetcher.layers) {
        const layerName = typeof layer === "string" ? layer : layer.out;
        if (!layerName) continue;

        const sourceDir = join(ctx.outputDir, "..", layerName);
        const destDir = join(ctx.outputDir, layerName);

        try {
            await copy(sourceDir, destDir, { overwrite: true });
        } catch (e) {
            console.warn(`Warning: failed to copy layer ${layerName}: ${e}`);
        }
    }
}

export function getCompositionDeps(fetcher: Composition): string[] {
    return fetcher.layers
        .map((l) => (typeof l === "string" ? l : l.out))
        .filter((l): l is string => !!l);
}
