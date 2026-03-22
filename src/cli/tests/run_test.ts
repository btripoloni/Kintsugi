import { assertEquals } from "jsr:@std/assert";
import { parseRunArgs } from "../commands/run.ts";

Deno.test("parseRunArgs - parses basic arguments", () => {
  const args = parseRunArgs(["run", "skyrim"]);
  assertEquals(args.modlist, "skyrim");
  assertEquals(args.profile, "default");
  assertEquals(args.kintsugiRoot, ".kintsugi");
});

Deno.test("parseRunArgs - parses profile argument", () => {
  const args = parseRunArgs(["run", "skyrim", "editor"]);
  assertEquals(args.modlist, "skyrim");
  assertEquals(args.profile, "editor");
});

Deno.test("parseRunArgs - parses --root option", () => {
  const args = parseRunArgs(["run", "skyrim", "default", "--root", "/custom/path"]);
  assertEquals(args.kintsugiRoot, "/custom/path");
});

Deno.test("parseRunArgs - uses environment variable for root", () => {
  const originalEnv = Deno.env.get("KINTSUGI_ROOT");
  Deno.env.set("KINTSUGI_ROOT", "/env/path");

  try {
    const args = parseRunArgs(["run", "skyrim"]);
    assertEquals(args.kintsugiRoot, "/env/path");
  } finally {
    if (originalEnv) {
      Deno.env.set("KINTSUGI_ROOT", originalEnv);
    }
  }
});
