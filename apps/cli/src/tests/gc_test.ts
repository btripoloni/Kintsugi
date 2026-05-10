import { assertEquals, assertRejects } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { exists } from "jsr:@std/fs";
import { gcCommand, parseGcArgs } from "../commands/gc.ts";
import { saveRecipe } from "../store/store.ts";
import type { Recipe } from "@btripoloni/kintsugi";

Deno.test("parseGcArgs - parses basic arguments", () => {
    const args = parseGcArgs(["gc", "--dry-run"]);
    assertEquals(args.dryRun, true);
    assertEquals(args.root, undefined);
});

Deno.test("parseGcArgs - parses --root option", () => {
    const args = parseGcArgs(["gc", "--root", "/custom/path"]);
    assertEquals(args.dryRun, false);
    assertEquals(args.root, "/custom/path");
});

Deno.test("gcCommand - cleans up unreachable shards", async () => {
    const tmpDir = await Deno.makeTempDir();
    const storeDir = join(tmpDir, "store");
    const recipesDir = join(storeDir, "recipes");
    const modlistsDir = join(tmpDir, "modlists");
    const modlistName = "test-modlist";
    const modlistDir = join(modlistsDir, modlistName);

    await Deno.mkdir(recipesDir, { recursive: true });
    await Deno.mkdir(modlistDir, { recursive: true });

    // 1. Create reachable shards
    const reachableHash = "reachable-hash";
    const depHash = "dep-hash";
    const layerHash = "layer-hash";

    const reachableRecipe: Recipe = {
        out: reachableHash,
        src: { type: "composition", layers: [layerHash] },
        _dependencyHashes: [depHash],
    };
    const depRecipe: Recipe = { out: depHash, src: { type: "local", path: "test" } };
    const layerRecipe: Recipe = { out: layerHash, src: { type: "local", path: "test" } };

    await saveRecipe(recipesDir, reachableHash, reachableRecipe);
    await saveRecipe(recipesDir, depHash, depRecipe);
    await saveRecipe(recipesDir, layerHash, layerRecipe);

    await Deno.mkdir(join(storeDir, reachableHash));
    await Deno.mkdir(join(storeDir, depHash));
    await Deno.mkdir(join(storeDir, layerHash));

    // 2. Create unreachable shards
    const unreachableHash = "unreachable-hash";
    const unreachableRecipe: Recipe = { out: unreachableHash, src: { type: "local", path: "test" } };
    await saveRecipe(recipesDir, unreachableHash, unreachableRecipe);
    await Deno.mkdir(join(storeDir, unreachableHash));

    // 3. Setup active modlist link
    const activePath = join(modlistDir, "active");
    await Deno.symlink(join(storeDir, reachableHash), activePath);

    // 4. Run GC
    await gcCommand({ dryRun: false, root: tmpDir });

    // 5. Verify
    assertEquals(await exists(join(storeDir, reachableHash)), true, "Reachable shard should exist");
    assertEquals(await exists(join(storeDir, depHash)), true, "Dependency shard should exist");
    assertEquals(await exists(join(storeDir, layerHash)), true, "Layer shard should exist");
    assertEquals(await exists(join(recipesDir, `${reachableHash}.json`)), true, "Reachable recipe should exist");

    assertEquals(await exists(join(storeDir, unreachableHash)), false, "Unreachable shard should be deleted");
    assertEquals(await exists(join(recipesDir, `${unreachableHash}.json`)), false, "Unreachable recipe should be deleted");

    await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("gcCommand - dry run doesn't delete anything", async () => {
    const tmpDir = await Deno.makeTempDir();
    const storeDir = join(tmpDir, "store");
    const recipesDir = join(storeDir, "recipes");

    await Deno.mkdir(recipesDir, { recursive: true });

    const unreachableHash = "unreachable-hash";
    const unreachableRecipe: Recipe = { out: unreachableHash, src: { type: "local", path: "test" } };
    await saveRecipe(recipesDir, unreachableHash, unreachableRecipe);
    await Deno.mkdir(join(storeDir, unreachableHash));

    // Run GC in dry-run mode
    await gcCommand({ dryRun: true, root: tmpDir });

    // Verify nothing was deleted
    assertEquals(await exists(join(storeDir, unreachableHash)), true, "Shard should still exist in dry-run");
    assertEquals(await exists(join(recipesDir, `${unreachableHash}.json`)), true, "Recipe should still exist in dry-run");

    await Deno.remove(tmpDir, { recursive: true });
});
