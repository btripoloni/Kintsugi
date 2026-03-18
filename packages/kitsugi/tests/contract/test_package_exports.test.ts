import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("package exports", () => {
  const packageJsonPath = resolve(__dirname, "../../package.json");

  test("package.json has exports field", () => {
    const content = readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.exports).toEqual(expect.any(Object));
  });

  test("exports has root entry point", () => {
    const content = readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.exports["."]).toEqual(expect.any(Object));
  });

  test("exports root has import pointing to dist/index.js", () => {
    const content = readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.exports["."].import).toBe("./dist/index.js");
  });

  test("exports root has types pointing to dist/index.d.ts", () => {
    const content = readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.exports["."].types).toBe("./dist/index.d.ts");
  });
});
