import { assertEquals, assertExists } from "jsr:@std/assert";
import { getRecipePath, readRecipe, recipeExists } from "../src/store/store.ts";
import type { Recipe } from "../src/types/recipe.ts";
import { join } from "jsr:@std/path";

Deno.test("getRecipePath should return correct path for recipe", () => {
    const hash = "abc123";
    const name = "MyMod";
    const version = "1.0.0";

    const path = getRecipePath(hash, name, version);

    const expected = `store/recipes/${hash}-${name}-${version}.json`;
    assertEquals(path, expected);
});

Deno.test("recipeExists should return false for non-existent recipe", async () => {
    const exists = await recipeExists("non-existent-hash", "TestMod", "1.0.0");
    assertEquals(exists, false);
});
