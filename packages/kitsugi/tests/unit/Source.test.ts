import { describe, expect, test } from "bun:test";
import { createSource, SourceType } from "../../src/entities/Source";

describe("Source entity", () => {
  test("creates Source with json type", () => {
    const source = createSource({
      type: "json",
      path: "config",
      content: { version: "1.0.0" },
    });

    expect(source.type).toBe("json");
    expect(source.path).toBe("config");
    expect(source.content).toEqual({ version: "1.0.0" });
  });

  test("creates Source with local type", () => {
    const source = createSource({
      type: "local",
      path: "mods/my-mod",
    });

    expect(source.type).toBe("local");
    expect(source.path).toBe("mods/my-mod");
  });

  test("creates Source with url type", () => {
    const source = createSource({
      type: "url",
      url: "https://example.com/mod.zip",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
    });

    expect(source.type).toBe("url");
    expect(source.url).toBe("https://example.com/mod.zip");
    expect(source.sha256).toBe("abc123def456abc123def456abc123def456abc123def456abc123def456abc1");
  });

  test("creates Source with vase type", () => {
    const source = createSource({
      type: "vase",
      vase: "skyrim-assets",
    });

    expect(source.type).toBe("vase");
    expect(source.vase).toBe("skyrim-assets");
  });

  test("Source validates type is json, local, url, or vase", () => {
    expect(() => {
      createSource({ type: "invalid" as SourceType });
    }).toThrow();
  });

  test("Source validates json requires path", () => {
    expect(() => {
      createSource({ type: "json", content: {} });
    }).toThrow();
  });

  test("Source validates json requires content", () => {
    expect(() => {
      createSource({ type: "json", path: "config" });
    }).toThrow();
  });

  test("Source validates local requires path", () => {
    expect(() => {
      createSource({ type: "local" });
    }).toThrow();
  });

  test("Source validates url requires url", () => {
    expect(() => {
      createSource({ type: "url", sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1" });
    }).toThrow();
  });

  test("Source validates url requires sha256", () => {
    expect(() => {
      createSource({ type: "url", url: "https://example.com/mod.zip" });
    }).toThrow();
  });

  test("Source validates vase requires vase", () => {
    expect(() => {
      createSource({ type: "vase" });
    }).toThrow();
  });

  test("Source has toJSON method", () => {
    const source = createSource({
      type: "url",
      url: "https://example.com/mod.zip",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
    });

    const json = source.toJSON();
    expect(json.type).toBe("url");
    expect(json.url).toBe("https://example.com/mod.zip");
    expect(json.sha256).toBe("abc123def456abc123def456abc123def456abc123def456abc123def456abc1");
  });
});
