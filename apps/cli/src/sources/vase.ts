import { join } from "jsr:@std/path";
import { copy } from "jsr:@std/fs";
import type { FetchVase } from "@btripoloni/kintsugi";
import type { SourceContext } from "./types.ts";

export async function executeVase(
    fetcher: FetchVase,
    ctx: SourceContext,
    root: string,
): Promise<void> {
    const vasesDir = join(root, "vases");
    const vasePath = join(vasesDir, fetcher.vase);

    await copy(vasePath, ctx.outputDir, { overwrite: true });
}

export function getVaseDeps(_fetcher: FetchVase): string[] {
    return [];
}
