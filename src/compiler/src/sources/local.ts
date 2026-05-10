import { copy } from "jsr:@std/fs";
import { join, relative } from "jsr:@std/path";
import type { FetchLocal } from "../types/fetchers.ts";

export interface SourceContext {
    modlistRoot: string;
    outputDir: string;
}

export async function executeLocal(
    fetcher: FetchLocal,
    ctx: SourceContext,
): Promise<void> {
    const sourcePath = join(ctx.modlistRoot, fetcher.path);
    const destPath = join(ctx.outputDir, fetcher.path);

    const destDir = destPath.substring(0, destPath.lastIndexOf("/"));
    await Deno.mkdir(destDir, { recursive: true });

    await copy(sourcePath, destPath, { overwrite: true });
}

export function getLocalDeps(_fetcher: FetchLocal): string[] {
    return [];
}
