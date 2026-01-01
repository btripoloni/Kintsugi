import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { mkLocal, mkUrl } from "../lib/sources.ts";
import { mkComposition } from "../lib/modpack.ts";

Deno.test("kintsugi interpreter integration", async (t) => {
    let gameOut = "";
    let skseOut = "";

    await t.step("mkLocal generates valid derivation", async () => {
        const drv = await mkLocal("skyrimse", "1.6.117", "/games/skyrim");
        assertStringIncludes(drv.out, "-skyrimse-1.6.117");
        assertEquals(drv.src.source, "local");
        assertEquals(drv.src.path, "/games/skyrim");
        gameOut = drv.out;
        console.log("Game Out:", gameOut);
    });

    await t.step("mkUrl generates valid derivation", async () => {
        const drv = await mkUrl(
            "skse",
            "2.0.0",
            "https://example.com/skse.zip",
            "sha256-hash"
        );
        assertStringIncludes(drv.out, "-skse-2.0.0");
        assertEquals(drv.src.source, "url");
        skseOut = drv.out;
        console.log("SKSE Out:", skseOut);
    });

    await t.step("mkComposition composes derivations", async () => {
        // Re-create objects to simulate passing them
        const game = await mkLocal("skyrimse", "1.6.117", "/games/skyrim");
        const skse = await mkUrl("skse", "2.0.0", "https://example.com/skse.zip", "sha256-hash");

        const modpack = await mkComposition({
            name: "test-modpack",
            layers: [game, skse],
            entrypoint: "skse_loader.exe"
        });

        assertStringIncludes(modpack.out, "-test-modpack-generated"); // or whatever version default is
        assertEquals(modpack.src.source, "build");
        assertEquals(modpack.src.layers?.length, 2);
        assertEquals(modpack.src.layers?.[0], gameOut);
        assertEquals(modpack.src.layers?.[1], skseOut);
    });
});
