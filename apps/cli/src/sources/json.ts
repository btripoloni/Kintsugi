import { join } from "jsr:@std/path";
import type { WriteJson } from "@btripoloni/kintsugi";
import type { SourceContext } from "./types.ts";

export async function executeJson(
    fetcher: WriteJson,
    ctx: SourceContext,
): Promise<void> {
    const filePath = join(ctx.outputDir, fetcher.path);
    await Deno.mkdir(ctx.outputDir, { recursive: true });
    await Deno.writeTextFile(filePath, JSON.stringify(fetcher.content, null, 2));
}

export function getJsonDeps(_fetcher: WriteJson): string[] {
    return [];
}