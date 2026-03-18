import { describe, expect, test } from "bun:test";
import { ModPack } from "../../src/entities/ModPack";
import { Mod } from "../../src/entities/Mod";
import { createSource } from "../../src/entities/Source";

describe("ModPack entity", () => {
  test("creates ModPack with name, version, and mods array", () => {
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
      metadata: { author: "TestUser" },
    });

    expect(modpack.name).toBe("Kitchen Sink");
    expect(modpack.version).toBe("1.0.0");
    expect(modpack.mods).toHaveLength(1);
    expect(modpack.mods[0].id).toBe("jei");
    expect(modpack.metadata.author).toBe("TestUser");
  });

  test("ModPack has toJSON method", () => {
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

    const json = modpack.toJSON();
    expect(json.name).toBe("Kitchen Sink");
    expect(json.version).toBe("1.0.0");
    expect(json.mods).toHaveLength(1);
    expect(json.mods[0].id).toBe("jei");
  });

  test("ModPack can add mods via addMod method", () => {
    const modpack = new ModPack({
      name: "Kitchen Sink",
      version: "1.0.0",
      mods: [],
    });

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

    modpack.addMod(jeiMod);

    expect(modpack.mods).toHaveLength(1);
    expect(modpack.mods[0].id).toBe("jei");
  });

  test("ModPack requires name field", () => {
    expect(() => {
      new ModPack({
        version: "1.0.0",
        mods: [],
      });
    }).toThrow();
  });
});
