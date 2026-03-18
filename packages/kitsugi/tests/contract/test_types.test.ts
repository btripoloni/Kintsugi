import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "fs";
import { resolve } from "path";

describe("TypeScript declaration files", () => {
  const distPath = resolve(__dirname, "../../dist");

  test("dist directory exists", () => {
    expect(existsSync(distPath)).toBe(true);
  });

  test("dist contains index.d.ts file", () => {
    expect(existsSync(resolve(distPath, "index.d.ts"))).toBe(true);
  });

  test("dist contains index.js file", () => {
    expect(existsSync(resolve(distPath, "index.js"))).toBe(true);
  });

  test("dist contains declaration map (.d.ts.map)", () => {
    expect(existsSync(resolve(distPath, "index.d.ts.map"))).toBe(true);
  });

  test("dist contains source map (.js.map)", () => {
    expect(existsSync(resolve(distPath, "index.js.map"))).toBe(true);
  });

  test("dist contains at least 4 files (js, d.ts, and maps)", () => {
    const files = readdirSync(distPath);
    expect(files.length).toBeGreaterThanOrEqual(4);
  });
});
