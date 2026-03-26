import { copy } from "jsr:@std/fs";
import { join } from "jsr:@std/path";
import type { FetchLocal } from "@btripoloni/kintsugi";
import type { SourceContext } from "./types.ts";

export async function executeLocal(
    fetcher: FetchLocal,
    ctx: SourceContext,
): Promise<void> {
    const sourcePath = join(ctx.modlistRoot, fetcher.path);
    await copy(sourcePath, ctx.outputDir, { overwrite: true });
}

export function getLocalDeps(_fetcher: FetchLocal): string[] {
    return [];
}