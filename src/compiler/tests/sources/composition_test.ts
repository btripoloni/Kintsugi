import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { executeComposition } from "../../src/sources/composition.ts";
import type { Composition } from "../../src/types/fetchers.ts";

Deno.test("Composition type should have correct type string", () => {
    const fetcher: Composition = {
        type: "composition",
        layers: ["layer1", "layer2", "layer3"],
    };

    assertEquals(fetcher.type, "composition");
});

Deno.test("Composition should serialize to JSON correctly", () => {
    const fetcher: Composition = {
        type: "composition",
        layers: [
            "87d173fde2a310f689e131926624283b-skyrimse-1.16.1170",
            "aa322c36a09e696d40f84215bdb8770e-run-spec-launcher-1.0.0",
        ],
    };

    const json = JSON.stringify(fetcher);
    const parsed = JSON.parse(json);

    assertEquals(parsed.type, "composition");
    assertEquals(parsed.layers.length, 2);
    assertEquals(parsed.layers[0], "87d173fde2a310f689e131926624283b-skyrimse-1.16.1170");
});

Deno.test("Composition should deserialize from JSON correctly", () => {
    const json = '{"type":"composition","layers":["layer1","layer2"]}';
    const parsed = JSON.parse(json) as Composition;

    assertEquals(parsed.type, "composition");
    assertEquals(parsed.layers, ["layer1", "layer2"]);
});

Deno.test("Composition layers should be in order (last wins)", () => {
    const fetcher: Composition = {
        type: "composition",
        layers: ["layer-a", "layer-b", "layer-c"],
    };

    assertEquals(fetcher.layers[0], "layer-a");
    assertEquals(fetcher.layers[1], "layer-b");
    assertEquals(fetcher.layers[2], "layer-c");
});

Deno.test("executeComposition should create hard links from layers", async () => {
    const tmpDir = await Deno.makeTempDir();

    const storeDir = join(tmpDir, "store");
    const layer1Dir = join(storeDir, "layer1");
    const layer2Dir = join(storeDir, "layer2");
    const outputDir = join(tmpDir, "output");

    await Deno.mkdir(layer1Dir, { recursive: true });
    await Deno.mkdir(layer2Dir, { recursive: true });

    await Deno.writeTextFile(join(layer1Dir, "file1.txt"), "from layer1");
    await Deno.writeTextFile(join(layer2Dir, "file2.txt"), "from layer2");
    await Deno.writeTextFile(join(layer2Dir, "shared.txt"), "layer2 wins");

    const sharedInLayer1 = join(layer1Dir, "shared.txt");
    await Deno.writeTextFile(sharedInLayer1, "layer1");

    const fetcher: Composition = {
        type: "composition",
        layers: ["layer1", "layer2"],
    };

    await executeComposition(fetcher, {
        modlistRoot: tmpDir,
        outputDir,
    });

    const file1Content = await Deno.readTextFile(join(outputDir, "file1.txt"));
    assertEquals(file1Content, "from layer1");

    const file2Content = await Deno.readTextFile(join(outputDir, "file2.txt"));
    assertEquals(file2Content, "from layer2");

    const sharedContent = await Deno.readTextFile(join(outputDir, "shared.txt"));
    assertEquals(sharedContent, "layer2 wins");

    await Deno.remove(tmpDir, { recursive: true });
});
