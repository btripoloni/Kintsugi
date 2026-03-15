import { describe, expect, test } from "bun:test";
import { LocalSource } from "../../../src/sources/LocalSource";

describe("LocalSource handler", () => {
  test("creates LocalSource with path", () => {
    const source = LocalSource({
      path: "mods/my-mod",
    });

    expect(source.type).toBe("local");
    expect(source.path).toBe("mods/my-mod");
  });

  test("LocalSource validates path is provided", () => {
    expect(() => {
      LocalSource({ path: "" });
    }).toThrow();
  });

  test("LocalSource path is relative to modlist root", () => {
    const source = LocalSource({
      path: "textures pack/assets",
    });

    expect(source.path).toBe("textures pack/assets");
    expect(source.path.includes("..")).toBe(false);
  });

  test("LocalSource has toJSON method", () => {
    const source = LocalSource({
      path: "config/settings.json",
    });

    const json = source.toJSON();
    expect(json.type).toBe("local");
    expect(json.path).toBe("config/settings.json");
  });

  test("LocalSource handles directory paths", () => {
    const source = LocalSource({
      path: "mods folder",
    });

    expect(source.path).toBe("mods folder");
  });

  test("LocalSource handles paths with extensions", () => {
    const source = LocalSource({
      path: "data/config.toml",
    });

    expect(source.path).toBe("data/config.toml");
  });
});
