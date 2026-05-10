import { join } from "jsr:@std/path";
import type { WriteRun } from "@btripoloni/kintsugi";
import type { SourceContext } from "./types.ts";

export async function executeRun(
    fetcher: WriteRun,
    ctx: SourceContext,
): Promise<void> {
    const kintsugiExecDir = join(ctx.outputDir, "kintsugi", "exec");
    await Deno.mkdir(kintsugiExecDir, { recursive: true });

    const manifestPath = join(kintsugiExecDir, `${fetcher.profile}.run.json`);
    const manifest = {
        entrypoint: fetcher.entrypoint,
        args: fetcher.args,
        env: fetcher.env,
    };

    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
}

export function getRunDeps(_fetcher: WriteRun): string[] {
    return [];
}
