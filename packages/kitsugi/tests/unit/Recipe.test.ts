import { describe, expect, test } from "bun:test";
import { generateRecipe } from "../../src/output/RecipeGenerator";
import { ModPack } from "../../src/entities/ModPack";
import { Mod } from "../../src/entities/Mod";
import { createSource } from "../../src/entities/Source";

describe("Recipe output", () => {
  test("generates Recipe JSON with correct structure", () => {
    const jeiSource = createSource({
      type: "url",
      url: "https://curseforge.com/jei",
      path: "/jei.jar",
      sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    });

    const jeiMod = new Mod({
      id: "jei",
      name: "Just Enough Items",
      version: "1.20.1",
      source: jeiSource,
    });

    const modpack = new ModPack({
      name: "Kitchen Sink",
      version: "1.0.0",
      mods: [jeiMod],
    });

    const recipe = generateRecipe(modpack);

    expect(recipe).toEqual({
      name: "Kitchen Sink",
      version: "1.0.0",
      mods: [
        {
          id: "jei",
          name: "Just Enough Items",
          version: "1.20.1",
          source: {
            type: "url",
            url: "https://curseforge.com/jei",
            path: "/jei.jar",
            sha256: "0000000000000000000000000000000000000000000000000000000000000000",
          },
        },
      ],
    });
  });

  test("Recipe JSON has name, version, and mods fields", () => {
    const modpack = new ModPack({
      name: "Test Pack",
      version: "2.0.0",
      mods: [],
    });

    const recipe = generateRecipe(modpack);

    expect(recipe).toHaveProperty("name");
    expect(recipe).toHaveProperty("version");
    expect(recipe).toHaveProperty("mods");
  });

  test("Recipe JSON mods is an array", () => {
    const modpack = new ModPack({
      name: "Test Pack",
      version: "1.0.0",
      mods: [],
    });

    const recipe = generateRecipe(modpack);

    expect(Array.isArray(recipe.mods)).toBe(true);
  });

  test("Recipe JSON matches Go executor contract", () => {
    const modSource = createSource({
      type: "url",
      url: "https://example.com/mod.jar",
      path: "/mod.jar",
      sha256: "0000000000000000000000000000000000000000000000000000000000000001",
    });

    const mod = new Mod({
      id: "test-mod",
      name: "Test Mod",
      version: "1.0.0",
      source: modSource,
    });

    const modpack = new ModPack({
      name: "Contract Test",
      version: "1.0.0",
      mods: [mod],
    });

    const recipe = generateRecipe(modpack);

    const modJson = recipe.mods[0];
    expect(modJson).toHaveProperty("id");
    expect(modJson).toHaveProperty("name");
    expect(modJson).toHaveProperty("version");
    expect(modJson).toHaveProperty("source");
    expect(modJson.source).toHaveProperty("type");
    expect(modJson.source).toHaveProperty("url");
    expect(modJson.source).toHaveProperty("path");
    expect(modJson.source).toHaveProperty("sha256");
  });
});
