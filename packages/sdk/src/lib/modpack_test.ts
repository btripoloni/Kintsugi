import { assertEquals } from "jsr:@std/assert";
import { compose } from "./modpack.ts";
import type { Shard } from "../types/shard.ts";

Deno.test("compose should process layers without requiring pre-computed out field", async () => {
    // Setup: Create a layer without `out` field (as user would do)
    const skyrimVase: Shard["src"] = {
        type: "vase",
        vase: "skyrimse-1-16-1",
    };

    const skyrim: Shard = {
        name: "skyrimse-1-16-1",
        version: "0.1",
        src: skyrimVase,
    };

    // Execute
    const result = await compose({
        name: "test-build",
        layers: [skyrim],
    });

    // Verify
    assertEquals(result.src.type, "composition");

    // The composition should have the layer hash
    if (result.src.type === "composition") {
        assertEquals(
            result.src.layers.length,
            1,
            "Composition should have exactly 1 layer",
        );
        const firstLayer = result.src.layers[0];
        const layerStr = typeof firstLayer === "string" ? firstLayer : firstLayer.out || "";
        assertEquals(
            layerStr.includes("skyrimse-1-16-1"),
            true,
            "Layer hash should contain the layer name",
        );
    }

    // Dependencies should be populated
    assertEquals(
        result.dependencies?.length,
        1,
        "Result should have 1 dependency",
    );
});

Deno.test("compose should handle layers that already have out field", async () => {
    // Setup: Create a layer with pre-computed `out` field
    const existingLayer: Shard = {
        name: "existing-layer",
        version: "1.0",
        src: { type: "vase", vase: "some-vase" },
        out: "abc123-existing-layer-1.0",
    };

    // Execute
    const result = await compose({
        name: "test-with-existing",
        layers: [existingLayer],
    });

    // Verify
    if (result.src.type === "composition") {
        assertEquals(
            result.src.layers.length,
            1,
            "Should have 1 layer",
        );
        assertEquals(
            result.src.layers[0],
            "abc123-existing-layer-1.0",
            "Should use the pre-computed out field",
        );
    }
});

Deno.test("compose should handle empty layers array", async () => {
    // Execute
    const result = await compose({
        name: "empty-build",
        layers: [],
    });

    // Verify
    assertEquals(result.src.type, "composition");
    if (result.src.type === "composition") {
        assertEquals(result.src.layers.length, 0);
    }
});
