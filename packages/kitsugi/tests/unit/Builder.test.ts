import { describe, expect, test } from "bun:test";
import { Builder } from "../../src/builder/Builder";
import { createSource } from "../../src/entities/Source";

describe("Builder DSL", () => {
  test("creates modpack with .modPack()", () => {
    const builder = new Builder();
    const result = builder.modPack("Kitchen Sink", "1.0.0");

    expect(result).toBeInstanceOf(Builder);
  });

  test("adds mod with .mod()", () => {
    const builder = new Builder();
    builder.modPack("Kitchen Sink", "1.0.0");
    builder.mod({
      id: "jei",
      name: "Just Enough Items",
      version: "1.20.1",
      source: createSource({
        type: "url",
        url: "https://curseforge.com/jei",
        path: "/jei.jar",
        sha256: "0000000000000000000000000000000000000000000000000000000000000000",
      }),
    });

    const modpack = builder.build();
    expect(modpack.mods).toHaveLength(1);
    expect(modpack.mods[0].id).toBe("jei");
  });

  test("fluent chain works: .modPack().mod().mod().build()", () => {
    const builder = new Builder();
    const modpack = builder
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
      .build();

    expect(modpack.name).toBe("Kitchen Sink");
    expect(modpack.version).toBe("1.0.0");
    expect(modpack.mods).toHaveLength(2);
    expect(modpack.mods[0].id).toBe("jei");
    expect(modpack.mods[1].id).toBe("rei");
  });

  test("build() returns ModPack instance", () => {
    const builder = new Builder();
    builder.modPack("Test", "1.0.0");

    const modpack = builder.build();
    expect(modpack).toHaveProperty("name");
    expect(modpack).toHaveProperty("version");
    expect(modpack).toHaveProperty("mods");
    expect(modpack).toHaveProperty("addMod");
  });

  test("generates recipe JSON via build() with toJSON()", () => {
    const builder = new Builder();
    const modpack = builder
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
      .build();

    const json = modpack.toJSON();
    expect(json.name).toBe("Kitchen Sink");
    expect(json.mods).toHaveLength(1);
  });
});
