import { describe, expect, test } from "bun:test";
import { JsonSource } from "../../../src/sources/JsonSource";

describe("JsonSource handler", () => {
  test("creates JsonSource with path and content", () => {
    const source = JsonSource({
      path: "config",
      content: { version: "1.0.0", debug: false },
    });

    expect(source.type).toBe("json");
    expect(source.path).toBe("config");
    expect(source.content).toEqual({ version: "1.0.0", debug: false });
  });

  test("JsonSource serializes content to JSON string", () => {
    const source = JsonSource({
      path: "mods-list",
      content: ["mod1", "mod2", "mod3"],
    });

    const json = JSON.stringify(source.content);
    expect(json).toBe('["mod1","mod2","mod3"]');
  });

  test("JsonSource validates path is provided", () => {
    expect(() => {
      JsonSource({ path: "", content: {} });
    }).toThrow();
  });

  test("JsonSource validates content is provided", () => {
    expect(() => {
      JsonSource({ path: "config", content: undefined as any });
    }).toThrow();
  });

  test("JsonSource has toJSON method", () => {
    const source = JsonSource({
      path: "settings",
      content: { theme: "dark" },
    });

    const json = source.toJSON();
    expect(json.type).toBe("json");
    expect(json.path).toBe("settings");
    expect(json.content).toEqual({ theme: "dark" });
  });

  test("JsonSource handles nested objects", () => {
    const source = JsonSource({
      path: "complex",
      content: {
        nested: {
          deep: {
            value: 42,
          },
        },
        array: [1, 2, 3],
      },
    });

    expect(source.content.nested.deep.value).toBe(42);
    expect(source.content.array).toEqual([1, 2, 3]);
  });
});
