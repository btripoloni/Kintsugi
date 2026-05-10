import { assertEquals, assertRejects } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs";
import { executeNexus } from "./nexus.ts";
import type { SourceContext } from "./types.ts";

Deno.test("nexus source: success when file exists with correct hash", async () => {
    const tempDir = await Deno.makeTempDir();
    const kintsugiRoot = join(tempDir, "kintsugi");
    const downloadsDir = join(kintsugiRoot, "downloads");
    await ensureDir(downloadsDir);

    const testContent = new TextEncoder().encode("nexus mod content");
    const testHash = await hashBuffer(testContent);
    const fileName = "mod-file.zip";
    await Deno.writeFile(join(downloadsDir, fileName), testContent);

    const outputDir = join(tempDir, "output");
    await ensureDir(outputDir);

    const ctx: SourceContext & { kintsugiRoot: string } = {
        outputDir,
        modlistRoot: tempDir,
        kintsugiRoot,
    };

    await executeNexus({
        type: "nexus",
        game: "stardewvalley",
        modId: 123,
        fileId: 456,
        sha256: testHash,
    }, ctx);

    const destPath = join(outputDir, fileName);
    const destContent = await Deno.readFile(destPath);
    assertEquals(destContent, testContent);

    await Deno.remove(tempDir, { recursive: true });
});

Deno.test("nexus source: failure when file does not exist", async () => {
    const tempDir = await Deno.makeTempDir();
    const kintsugiRoot = join(tempDir, "kintsugi");
    const downloadsDir = join(kintsugiRoot, "downloads");
    await ensureDir(downloadsDir);

    const outputDir = join(tempDir, "output");
    const ctx: SourceContext & { kintsugiRoot: string } = {
        outputDir,
        modlistRoot: tempDir,
        kintsugiRoot,
    };

    await assertRejects(
        async () => {
            await executeNexus({
                type: "nexus",
                game: "stardewvalley",
                modId: 123,
                fileId: 456,
                sha256: "wrong-hash",
            }, ctx);
        },
        Error,
        "Nexus Mod file not found in",
    );

    await Deno.remove(tempDir, { recursive: true });
});

Deno.test("nexus source: failure when hash mismatches", async () => {
    const tempDir = await Deno.makeTempDir();
    const kintsugiRoot = join(tempDir, "kintsugi");
    const downloadsDir = join(kintsugiRoot, "downloads");
    await ensureDir(downloadsDir);

    const testContent = new TextEncoder().encode("nexus mod content");
    const fileName = "mod-file.zip";
    await Deno.writeFile(join(downloadsDir, fileName), testContent);

    const outputDir = join(tempDir, "output");
    const ctx: SourceContext & { kintsugiRoot: string } = {
        outputDir,
        modlistRoot: tempDir,
        kintsugiRoot,
    };

    await assertRejects(
        async () => {
            await executeNexus({
                type: "nexus",
                game: "stardewvalley",
                modId: 123,
                fileId: 456,
                sha256: "incorrect-hash",
            }, ctx);
        },
        Error,
        "Nexus Mod file not found in",
    );

    await Deno.remove(tempDir, { recursive: true });
});

async function hashBuffer(content: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", content.slice().buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
