import { assertEquals, assertExists } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { executeLocal } from "../../src/sources/local.ts";
import type { FetchLocal } from "../../src/types/fetchers.ts";

Deno.test("FetchLocal type should have correct type string", () => {
    const fetcher: FetchLocal = {
        type: "local",
        path: "mods/my-mod",
    };

    assertEquals(fetcher.type, "local");
});

Deno.test("FetchLocal should serialize to JSON correctly", () => {
    const fetcher: FetchLocal = {
        type: "local",
        path: "mods/my-mod",
    };

    const json = JSON.stringify(fetcher);
    const parsed = JSON.parse(json);

    assertEquals(parsed.type, "local");
    assertEquals(parsed.path, "mods/my-mod");
});

Deno.test("FetchLocal should deserialize from JSON correctly", () => {
    const json = '{"type":"local","path":"mods/my-mod"}';
    const parsed = JSON.parse(json) as FetchLocal;

    assertEquals(parsed.type, "local");
    assertEquals(parsed.path, "mods/my-mod");
});

Deno.test("executeLocal should copy file from modlistRoot to outputDir", async () => {
    const tmpDir = await Deno.makeTempDir();
    const modlistRoot = join(tmpDir, "modlist");
    const outputDir = join(tmpDir, "output");

    await Deno.mkdir(join(modlistRoot, "mods"), { recursive: true });
    await Deno.writeTextFile(join(modlistRoot, "mods", "my-mod.jar"), "mod content");
    await Deno.mkdir(outputDir);

    const fetcher: FetchLocal = {
        type: "local",
        path: "mods/my-mod.jar",
    };

    await executeLocal(fetcher, { modlistRoot, outputDir });

    const destContent = await Deno.readTextFile(join(outputDir, "mods", "my-mod.jar"));
    assertEquals(destContent, "mod content");

    await Deno.remove(tmpDir, { recursive: true });
});
