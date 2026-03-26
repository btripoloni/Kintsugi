import { join } from "jsr:@std/path";
import type { FetchVase } from "../types/fetchers.ts";
import type { SourceContext } from "./local.ts";
import { getVasePath } from "../store/vase.ts";

export async function executeVase(
    fetcher: FetchVase,
    ctx: SourceContext,
    root: string,
): Promise<void> {
    const vasePath = getVasePath(root, fetcher.vase);

    await Deno.mkdir(ctx.outputDir, { recursive: true });

    await copyVaseFiles(vasePath, ctx.outputDir);
}

async function copyVaseFiles(srcDir: string, destDir: string): Promise<void> {
    await Deno.mkdir(destDir, { recursive: true });

    const entries = await Deno.readDir(srcDir);

    for await (const entry of entries) {
        if (entry.name === ".kintsugi-vase.json") {
            continue;
        }

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
            await copyVaseFiles(srcPath, destPath);
        }
    }
}

export function getVaseDeps(_fetcher: FetchVase): string[] {
    return [];
}
