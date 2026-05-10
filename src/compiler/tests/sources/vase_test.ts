import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { executeVase, getVaseDeps } from "../../src/sources/vase.ts";
import type { FetchVase } from "../../src/types/fetchers.ts";

Deno.test("FetchVase type should have correct type string", () => {
    const fetcher: FetchVase = {
        type: "vase",
        vase: "skyrim-1",
    };

    assertEquals(fetcher.type, "vase");
    assertEquals(fetcher.vase, "skyrim-1");
});

Deno.test("getVaseDeps should return empty array", () => {
    const fetcher: FetchVase = {
        type: "vase",
        vase: "skyrim-1",
    };

    const deps = getVaseDeps(fetcher);

    assertEquals(deps, []);
});

Deno.test("executeVase should create hardlinks from vase to output", async () => {
    const tmpDir = await Deno.makeTempDir();
    const vasesDir = join(tmpDir, "vases");
    const vaseDir = join(vasesDir, "skyrim-1");
    const sourceDir = join(tmpDir, "source");

    await Deno.mkdir(vaseDir, { recursive: true });
    await Deno.mkdir(join(sourceDir, "data"), { recursive: true });
    await Deno.mkdir(join(vaseDir, "data"), { recursive: true });

    await Deno.writeTextFile(join(vaseDir, "game.exe"), "game content");
    await Deno.writeTextFile(join(vaseDir, "data", "mod.dat"), "mod data");

    const outputDir = join(tmpDir, "output");

    const fetcher: FetchVase = {
        type: "vase",
        vase: "skyrim-1",
    };

    await executeVase(fetcher, {
        modlistRoot: tmpDir,
        outputDir: outputDir,
    }, tmpDir);

    const gameContent = await Deno.readTextFile(join(outputDir, "game.exe"));
    assertEquals(gameContent, "game content");

    const modContent = await Deno.readTextFile(join(outputDir, "data", "mod.dat"));
    assertEquals(modContent, "mod data");

    await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("executeVase should skip .kintsugi-vase.json metadata file", async () => {
    const tmpDir = await Deno.makeTempDir();
    const vasesDir = join(tmpDir, "vases");
    const vaseDir = join(vasesDir, "test-1");

    await Deno.mkdir(vaseDir, { recursive: true });
    await Deno.writeTextFile(join(vaseDir, ".kintsugi-vase.json"), '{"name":"test"}');
    await Deno.writeTextFile(join(vaseDir, "game.exe"), "game");

    const outputDir = join(tmpDir, "output");

    const fetcher: FetchVase = {
        type: "vase",
        vase: "test-1",
    };

    await executeVase(fetcher, {
        modlistRoot: tmpDir,
        outputDir: outputDir,
    }, tmpDir);

    let metadataExists = false;
    try {
        await Deno.stat(join(outputDir, ".kintsugi-vase.json"));
        metadataExists = true;
    } catch {
        metadataExists = false;
    }
    assertEquals(metadataExists, false);

    const gameExists = await Deno.stat(join(outputDir, "game.exe"));
    assertEquals(gameExists.isFile, true);

    await Deno.remove(tmpDir, { recursive: true });
});