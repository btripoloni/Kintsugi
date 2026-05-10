import { copy } from "jsr:@std/fs";
import { join } from "jsr:@std/path";
import { crypto } from "jsr:@std/crypto";
import type { FetchNexus } from "@btripoloni/kintsugi";
import type { SourceContext } from "./types.ts";

export async function executeNexus(
    fetcher: FetchNexus,
    ctx: SourceContext & { kintsugiRoot: string },
): Promise<void> {
    const downloadsDir = join(ctx.kintsugiRoot, "downloads");
    
    // Find file by scanning downloads directory
    let foundFile: string | null = null;
    for await (const entry of Deno.readDir(downloadsDir)) {
        if (!entry.isFile) continue;
        
        const filePath = join(downloadsDir, entry.name);
        const hash = await hashFile(filePath);
        if (hash === fetcher.sha256) {
            foundFile = filePath;
            break;
        }
    }

    if (!foundFile) {
        throw new Error(
            `Nexus Mod file not found in ${downloadsDir} with SHA256 ${fetcher.sha256}. ` +
            `Please download the file manually to the downloads folder.`
        );
    }

    const fileName = foundFile.split("/").pop()!;
    const destPath = join(ctx.outputDir, fileName);

    if (fetcher.unpack) {
        // Reuse unpack logic from url.ts if needed, but let's implement simple copy here for now
        // A better approach would be to refactor unpack logic to a shared utility
        await copy(foundFile, destPath, { overwrite: true });
    } else {
        await Deno.mkdir(ctx.outputDir, { recursive: true });
        await copy(foundFile, destPath, { overwrite: true });
    }
}

async function hashFile(path: string): Promise<string> {
    const content = await Deno.readFile(path);
    const hashBuffer = await crypto.subtle.digest("SHA-256", content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
