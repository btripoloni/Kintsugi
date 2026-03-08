import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("turbo.json validity", () => {
  const turboJsonPath = resolve(__dirname, "../../turbo.json");

  test("turbo.json file exists", () => {
    expect(() => readFileSync(turboJsonPath, "utf-8")).not.toThrow();
  });

  test("turbo.json has valid $schema", () => {
    const content = readFileSync(turboJsonPath, "utf-8");
    const config = JSON.parse(content);
    expect(config.$schema).toBe("https://turbo.build/schema.json");
  });

  test("turbo.json has tasks pipeline defined", () => {
    const content = readFileSync(turboJsonPath, "utf-8");
    const config = JSON.parse(content);
    expect(config.tasks).toEqual(expect.any(Object));
  });

  test("turbo.json has build task", () => {
    const content = readFileSync(turboJsonPath, "utf-8");
    const config = JSON.parse(content);
    expect(config.tasks.build).toEqual(expect.any(Object));
  });

  test("turbo.json has test task", () => {
    const content = readFileSync(turboJsonPath, "utf-8");
    const config = JSON.parse(content);
    expect(config.tasks.test).toEqual(expect.any(Object));
  });

  test("turbo.json has lint task", () => {
    const content = readFileSync(turboJsonPath, "utf-8");
    const config = JSON.parse(content);
    expect(config.tasks.lint).toEqual(expect.any(Object));
  });

  test("turbo.json has typecheck task", () => {
    const content = readFileSync(turboJsonPath, "utf-8");
    const config = JSON.parse(content);
    expect(config.tasks.typecheck).toEqual(expect.any(Object));
  });

  test("build task has dependsOn with ^build", () => {
    const content = readFileSync(turboJsonPath, "utf-8");
    const config = JSON.parse(content);
    expect(config.tasks.build.dependsOn).toContain("^build");
  });

  test("build task has outputs array with dist/**", () => {
    const content = readFileSync(turboJsonPath, "utf-8");
    const config = JSON.parse(content);
    expect(config.tasks.build.outputs).toContain("dist/**");
  });
});
