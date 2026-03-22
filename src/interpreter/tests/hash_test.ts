import { assertEquals, assertExists } from "jsr:@std/assert";
import { hashDerivation } from "../src/lib/hash.ts";
import { Source } from "../src/types/source.ts";

const dummyJsonSrc: Source = {
  type: "write_json",
  path: "test.json",
  content: { hello: "world" },
};
const dummyUrlSrc: Source = {
  type: "url",
  url: "https://example.com/mod.zip",
  sha256: "abc123",
};

Deno.test("hashDerivation - generates deterministic hash for same input", async () => {
  const drv1 = await hashDerivation({
    name: "testmod",
    version: "1.0.0",
    src: dummyJsonSrc,
    dependencies: [],
  });

  const drv2 = await hashDerivation({
    name: "testmod",
    version: "1.0.0",
    src: dummyJsonSrc,
    dependencies: [],
  });

  assertEquals(drv1.out, drv2.out);
});

Deno.test("hashDerivation - different inputs produce different hashes", async () => {
  const drv1 = await hashDerivation({
    name: "modA",
    version: "1.0.0",
    src: dummyJsonSrc,
    dependencies: [],
  });

  const drv2 = await hashDerivation({
    name: "modB",
    version: "1.0.0",
    src: dummyJsonSrc,
    dependencies: [],
  });

  assertExists(drv1.out);
  assertExists(drv2.out);
  assertEquals(drv1.out !== drv2.out, true);
});

Deno.test("hashDerivation - hash format is [hash]-[name]-[version]", async () => {
  const drv = await hashDerivation({
    name: "mymod",
    version: "2.0.0",
    src: dummyJsonSrc,
    dependencies: [],
  });

  const parts = drv.out.split("-");
  assertEquals(parts.length, 3);
  assertEquals(parts[1], "mymod");
  assertEquals(parts[2], "2.0.0");
  assertEquals(parts[0].length, 32);
});

Deno.test("hashDerivation - includes dependencies in hash calculation", async () => {
  const base = await hashDerivation({
    name: "basemod",
    version: "1.0.0",
    src: dummyJsonSrc,
    dependencies: [],
  });

  const withDeps = await hashDerivation({
    name: "dependentmod",
    version: "1.0.0",
    src: dummyJsonSrc,
    dependencies: [base.out],
  });

  assertEquals(withDeps.dependencies?.includes(base.out), true);
});

Deno.test("hashDerivation - handles composition source", async () => {
  const layer1 = await hashDerivation({
    name: "layer1",
    version: "1.0.0",
    src: dummyJsonSrc,
    dependencies: [],
  });

  const compositionSrc: Source = {
    type: "composition",
    layers: [layer1.out],
  };

  const drv = await hashDerivation({
    name: "composed",
    version: "1.0.0",
    src: compositionSrc,
    dependencies: [layer1.out],
  });

  assertExists(drv.out);
  assertEquals(drv.out.includes("composed"), true);
});

Deno.test("hashDerivation - key ordering does not affect hash", async () => {
  const src1: Source = {
    type: "write_json",
    path: "test.json",
    content: { hello: "world" },
  };
  const src2: Source = {
    content: { hello: "world" },
    path: "test.json",
    type: "write_json",
  };

  const drv1 = await hashDerivation({
    name: "samemod",
    version: "1.0.0",
    src: src1,
    dependencies: [],
  });

  const drv2 = await hashDerivation({
    name: "samemod",
    version: "1.0.0",
    src: src2,
    dependencies: [],
  });

  assertEquals(drv1.out, drv2.out);
});
