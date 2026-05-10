import { assertEquals, assertExists } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import type { Composition, Recipe } from "@btripoloni/kintsugi";
import { readRecipeByName, saveRecipe } from "../store/store.ts";
import { executeComposition } from "../sources/index.ts";

Deno.test("integration: composition of multiple local sources", async (t) => {
    const tmpDir = await Deno.makeTempDir();

    const storeDir = join(tmpDir, "store");
    const recipesDir = join(tmpDir, "recipes");
    const modlistDir = join(tmpDir, "modlist");
    const outputDir = join(tmpDir, "output");

    await Deno.mkdir(modlistDir, { recursive: true });
    await Deno.mkdir(recipesDir, { recursive: true });
    await Deno.mkdir(outputDir, { recursive: true });

    await Deno.writeTextFile(join(modlistDir, "mod1.txt"), "content 1");
    await Deno.writeTextFile(join(modlistDir, "mod2.txt"), "content 2");

    const hash1 = "a".repeat(32);
    const hash2 = "b".repeat(32);
    const out1 = `${hash1}-mod1-1.0.0`;
    const out2 = `${hash2}-mod2-1.0.0`;

    const shard1Dir = join(modlistDir, "store", out1);
    const shard2Dir = join(modlistDir, "store", out2);
    await Deno.mkdir(shard1Dir, { recursive: true });
    await Deno.mkdir(shard2Dir, { recursive: true });
    await Deno.copyFile(join(modlistDir, "mod1.txt"), join(shard1Dir, "mod1.txt"));
    await Deno.copyFile(join(modlistDir, "mod2.txt"), join(shard2Dir, "mod2.txt"));

    const recipe1: Recipe = {
        out: out1,
        src: { type: "local", path: "mod1.txt" },
    };
    await saveRecipe(recipesDir, out1, recipe1);

    const recipe2: Recipe = {
        out: out2,
        src: { type: "local", path: "mod2.txt" },
    };
    await saveRecipe(recipesDir, out2, recipe2);

    const compositionOut = "composed-hash-composed-1.0.0";
    const compositionLayers = [out1, out2];
    const compositionRecipe: Recipe = {
        out: compositionOut,
        src: { type: "composition", layers: compositionLayers },
    };
    await saveRecipe(recipesDir, compositionOut, compositionRecipe);

    const fetchedComp = await readRecipeByName(recipesDir, compositionOut);
    assertExists(fetchedComp);

    await executeComposition(fetchedComp!.src as Composition, {
        modlistRoot: modlistDir,
        outputDir,
    });

    const content1 = await Deno.readTextFile(join(outputDir, "mod1.txt"));
    const content2 = await Deno.readTextFile(join(outputDir, "mod2.txt"));
    assertEquals(content1, "content 1");
    assertEquals(content2, "content 2");

    await Deno.remove(tmpDir, { recursive: true });
});
