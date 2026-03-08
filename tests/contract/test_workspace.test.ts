import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("workspace linking", () => {
  const rootPackageJsonPath = resolve(__dirname, "../../package.json");
  const kitsugiPackageJsonPath = resolve(__dirname, "../../packages/kitsugi/package.json");

  test("root package.json exists", () => {
    expect(existsSync(rootPackageJsonPath)).toBe(true);
  });

  test("root package.json has workspaces array", () => {
    const content = readFileSync(rootPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.workspaces).toEqual(expect.any(Array));
  });

  test("root package.json workspaces includes packages/*", () => {
    const content = readFileSync(rootPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.workspaces).toContain("packages/*");
  });

  test("root package.json is private", () => {
    const content = readFileSync(rootPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.private).toBe(true);
  });

  test("kitsugi package exists", () => {
    expect(existsSync(kitsugiPackageJsonPath)).toBe(true);
  });

  test("kitsugi package has valid name", () => {
    const content = readFileSync(kitsugiPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.name).toBe("kitsugi");
  });

  test("kitsugi package has version 0.1.0", () => {
    const content = readFileSync(kitsugiPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.version).toBe("0.1.0");
  });

  test("kitsugi package has main entry point ./dist/index.js", () => {
    const content = readFileSync(kitsugiPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.main).toBe("./dist/index.js");
  });

  test("kitsugi package has types entry point ./dist/index.d.ts", () => {
    const content = readFileSync(kitsugiPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.types).toBe("./dist/index.d.ts");
  });

  test("kitsugi package has build script with tsc", () => {
    const content = readFileSync(kitsugiPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.scripts.build).toContain("tsc");
  });

  test("kitsugi package has test script with bun test", () => {
    const content = readFileSync(kitsugiPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.scripts.test).toBe("bun test");
  });

  test("kitsugi package has typecheck script", () => {
    const content = readFileSync(kitsugiPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.scripts.typecheck).toContain("tsc");
  });

  test("kitsugi package has exports for ESM", () => {
    const content = readFileSync(kitsugiPackageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    expect(pkg.exports).toEqual(expect.any(Object));
    expect(pkg.exports["."]).toEqual(expect.any(Object));
    expect(pkg.exports["."].import).toBe("./dist/index.js");
  });
});
