import { describe, expect, test } from "bun:test";
import { Builder } from "../../src/builder/Builder";
import { generateRecipe } from "../../src/output/RecipeGenerator";
import { createSource } from "../../src/entities/Source";

describe("DSL Builder Integration", () => {
  test("full flow: create modpack with mods, generate recipe JSON", () => {
    const modpack = new Builder()
      .modPack("Kitchen Sink", "1.0.0")
      .mod({
        id: "jei",
        name: "Just Enough Items",
        version: "1.20.1",
        source: createSource({
          type: "url",
          url: "https://curseforge.com/jei",
          path: "/jei.jar",
          sha256: "0000000000000000000000000000000000000000000000000000000000000000",
        }),
      })
      .mod({
        id: "rei",
        name: "Roughly Enough Items",
        version: "1.20.1",
        source: createSource({
          type: "url",
          url: "https://modrinth.com/rei",
          path: "/rei.jar",
          sha256: "0000000000000000000000000000000000000000000000000000000000000001",
        }),
      })
      .mod({
        id: "sodium",
        name: "Sodium",
        version: "1.20.1",
        source: createSource({
          type: "url",
          url: "https://modrinth.com/sodium",
          path: "/sodium.jar",
          sha256: "0000000000000000000000000000000000000000000000000000000000000002",
        }),
      })
      .build();

    const recipe = generateRecipe(modpack);

    expect(recipe.name).toBe("Kitchen Sink");
    expect(recipe.version).toBe("1.0.0");
    expect(recipe.mods).toHaveLength(3);
    expect(recipe.mods[0].id).toBe("jei");
    expect(recipe.mods[1].id).toBe("rei");
    expect(recipe.mods[2].id).toBe("sodium");
  });

  test("recipe JSON is valid for Go executor", () => {
    const modpack = new Builder()
      .modPack("Integration Test", "1.0.0")
      .mod({
        id: "test-mod",
        name: "Test Mod",
        version: "1.0.0",
        source: createSource({
          type: "url",
          url: "https://example.com/mod.jar",
          path: "/mod.jar",
          sha256: "0000000000000000000000000000000000000000000000000000000000000003",
        }),
      })
      .build();

    const recipe = generateRecipe(modpack);
    const jsonString = JSON.stringify(recipe);
    const parsed = JSON.parse(jsonString);

    expect(parsed.name).toBe("Integration Test");
    expect(parsed.version).toBe("1.0.0");
    expect(Array.isArray(parsed.mods)).toBe(true);
    expect(parsed.mods[0].source.type).toBe("url");
  });

  test("empty modpack generates valid recipe", () => {
    const modpack = new Builder().modPack("Empty Pack", "1.0.0").build();

    const recipe = generateRecipe(modpack);

    expect(recipe.name).toBe("Empty Pack");
    expect(recipe.mods).toHaveLength(0);
  });
});
