import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { executeJson } from "../../src/sources/json.ts";
import type { WriteJson } from "../../src/types/fetchers.ts";

Deno.test("WriteJson type should have correct type string", () => {
  const fetcher: WriteJson = {
    type: "write_json",
    path: "config/settings.json",
    content: { key: "value" },
  };

  assertEquals(fetcher.type, "write_json");
});

Deno.test("WriteJson should serialize to JSON correctly", () => {
  const fetcher: WriteJson = {
    type: "write_json",
    path: "config/settings.json",
    content: { key: "value", nested: { a: 1 } },
  };

  const json = JSON.stringify(fetcher);
  const parsed = JSON.parse(json);

  assertEquals(parsed.type, "write_json");
  assertEquals(parsed.path, "config/settings.json");
  assertEquals(parsed.content.key, "value");
  assertEquals(parsed.content.nested.a, 1);
});

Deno.test("WriteJson should deserialize from JSON correctly", () => {
  const json = '{"type":"write_json","path":"config/settings.json","content":{"key":"value"}}';
  const parsed = JSON.parse(json) as WriteJson;

  assertEquals(parsed.type, "write_json");
  assertEquals(parsed.path, "config/settings.json");
  assertEquals((parsed.content as Record<string, unknown>).key, "value");
});

Deno.test("executeJson should write JSON file to outputDir", async () => {
  const tmpDir = await Deno.makeTempDir();
  const outputDir = join(tmpDir, "output");
  await Deno.mkdir(outputDir, { recursive: true });

  const fetcher: WriteJson = {
    type: "write_json",
    path: "config/settings.json",
    content: { key: "value", number: 42 },
  };

  await executeJson(fetcher, { modlistRoot: "", outputDir });

  const content = await Deno.readTextFile(join(outputDir, "config", "settings.json"));
  const parsed = JSON.parse(content);
  
  assertEquals(parsed.key, "value");
  assertEquals(parsed.number, 42);

  await Deno.remove(tmpDir, { recursive: true });
});
