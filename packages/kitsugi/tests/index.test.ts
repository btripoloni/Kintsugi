import { describe, expect, test } from "bun:test";
import { hello, VERSION } from "../src/index";

describe("kitsugi", () => {
  test("VERSION is defined", () => {
    expect(VERSION).toBe("0.1.0");
  });

  test("hello returns greeting", () => {
    expect(hello()).toBe("Hello from kitsugi!");
  });
});
