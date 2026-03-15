import { describe, expect, test } from "bun:test";
import { VaseSource } from "../../../src/sources/VaseSource";

describe("VaseSource handler", () => {
  test("creates VaseSource with vase name", () => {
    const source = VaseSource({
      vase: "skyrim-assets",
    });

    expect(source.type).toBe("vase");
    expect(source.vase).toBe("skyrim-assets");
  });

  test("VaseSource validates vase is provided", () => {
    expect(() => {
      VaseSource({ vase: "" });
    }).toThrow();
  });

  test("VaseSource validates vase name format", () => {
    expect(() => {
      VaseSource({ vase: "Invalid-Vase-Name!" });
    }).toThrow();
  });

  test("VaseSource allows valid vase names", () => {
    const source = VaseSource({
      vase: "minecraft-mods-v2",
    });

    expect(source.vase).toBe("minecraft-mods-v2");
  });

  test("VaseSource allows names with numbers", () => {
    const source = VaseSource({
      vase: "modpack123",
    });

    expect(source.vase).toBe("modpack123");
  });

  test("VaseSource allows names with hyphens", () => {
    const source = VaseSource({
      vase: "fallout4-textures-hd",
    });

    expect(source.vase).toBe("fallout4-textures-hd");
  });

  test("VaseSource allows names with underscores", () => {
    const source = VaseSource({
      vase: "community_mods_v1",
    });

    expect(source.vase).toBe("community_mods_v1");
  });

  test("VaseSource has toJSON method", () => {
    const source = VaseSource({
      vase: "skyrim-assets",
    });

    const json = source.toJSON();
    expect(json.type).toBe("vase");
    expect(json.vase).toBe("skyrim-assets");
  });

  test("VaseSource handles different game collections", () => {
    const games = ["skyrim", "fallout4", "minecraft", "witcher3", "eldenring"];

    games.forEach((game) => {
      const source = VaseSource({
        vase: `${game}-assets`,
      });
      expect(source.vase).toBe(`${game}-assets`);
    });
  });
});
