import { describe, expect, test } from "bun:test";
import { Mod } from "../../src/entities/Mod";
import { createSource } from "../../src/entities/Source";

describe("Mod entity", () => {
  test("creates Mod with id, name, version, and source", () => {
    const source = createSource({
      type: "url",
      url: "https://curseforge.com/minecraft/mc-mods/just-enough-items",
      path: "/jei-1.20.1.jar",
      sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    });

    const mod = new Mod({
      id: "jei",
      name: "Just Enough Items",
      version: "1.20.1",
      source,
    });

    expect(mod.id).toBe("jei");
    expect(mod.name).toBe("Just Enough Items");
    expect(mod.version).toBe("1.20.1");
    expect(mod.source.type).toBe("url");
    expect(mod.source.url).toBe("https://curseforge.com/minecraft/mc-mods/just-enough-items");
    expect(mod.source.path).toBe("/jei-1.20.1.jar");
  });

  test("Mod has toJSON method", () => {
    const source = createSource({
      type: "url",
      url: "https://modrinth.com/mod/jei",
      path: "/jei-1.20.1.jar",
      sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    });

    const mod = new Mod({
      id: "jei",
      name: "Just Enough Items",
      version: "1.20.1",
      source,
    });

    const json = mod.toJSON();
    expect(json.id).toBe("jei");
    expect(json.name).toBe("Just Enough Items");
    expect(json.version).toBe("1.20.1");
    expect(json.source).toEqual({
      type: "url",
      url: "https://modrinth.com/mod/jei",
      path: "/jei-1.20.1.jar",
      sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    });
  });

  test("Mod requires id field", () => {
    expect(() => {
      new Mod({
        name: "Just Enough Items",
        version: "1.20.1",
        source: createSource({
          type: "url",
          url: "https://example.com",
          sha256: "0000000000000000000000000000000000000000000000000000000000000000",
        }),
      });
    }).toThrow();
  });

  test("Mod requires name field", () => {
    expect(() => {
      new Mod({
        id: "jei",
        version: "1.20.1",
        source: createSource({
          type: "url",
          url: "https://example.com",
          sha256: "0000000000000000000000000000000000000000000000000000000000000000",
        }),
      });
    }).toThrow();
  });
});
