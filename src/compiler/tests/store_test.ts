import { assertEquals, assertExists } from "jsr:@std/assert";
import { getRecipePath, readRecipe, recipeExists } from "../src/store/store.ts";
import type { Recipe } from "../src/types/recipe.ts";
import { join } from "jsr:@std/path";

Deno.test("getRecipePath should return correct path for recipe", () => {
    const out = "abc123-MyMod-1.0.0";

    const path = getRecipePath("store", out);

    const expected = `store/recipes/${out}.json`;
    assertEquals(path, expected);
});

Deno.test("recipeExists should return false for non-existent recipe", async () => {
    const exists = await recipeExists("store", "non-existent-hash-TestMod-1.0.0");
    assertEquals(exists, false);
});
