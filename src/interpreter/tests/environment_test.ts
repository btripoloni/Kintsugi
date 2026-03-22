import { assertEquals, assertExists } from "jsr:@std/assert";
import { readEnvironmentConfig, readRunManifest } from "../src/lib/environment.ts";

Deno.test("readEnvironmentConfig - returns native when file not found", async (t) => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const config = await readEnvironmentConfig(tmpDir);
    assertEquals(config.type, "native");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("readEnvironmentConfig - parses native environment", async (t) => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const envPath = `${tmpDir}/kintsugi/enviroment.json`;
    await Deno.mkdir(`${tmpDir}/kintsugi`, { recursive: true });
    await Deno.writeTextFile(envPath, JSON.stringify({ type: "native" }));

    const config = await readEnvironmentConfig(tmpDir);
    assertEquals(config.type, "native");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("readEnvironmentConfig - parses umu environment", async (t) => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const envPath = `${tmpDir}/kintsugi/enviroment.json`;
    await Deno.mkdir(`${tmpDir}/kintsugi`, { recursive: true });
    await Deno.writeTextFile(envPath, JSON.stringify({
      type: "umu",
      version: "GE-Proton9-4",
      id: "489830"
    }));

    const config = await readEnvironmentConfig(tmpDir);
    assertEquals(config.type, "umu");
    assertEquals((config as { version: string }).version, "GE-Proton9-4");
    assertEquals((config as { id: string }).id, "489830");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("readRunManifest - parses run manifest", async (t) => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const runPath = `${tmpDir}/kintsugi/exec/default.run.json`;
    await Deno.mkdir(`${tmpDir}/kintsugi/exec`, { recursive: true });
    await Deno.writeTextFile(runPath, JSON.stringify({
      name: "default",
      entrypoint: "skse64_loader.exe",
      args: ["-high"],
      env: { "VAR": "value" }
    }));

    const manifest = await readRunManifest(tmpDir, "default");
    assertEquals(manifest.name, "default");
    assertEquals(manifest.entrypoint, "skse64_loader.exe");
    assertEquals(manifest.args, ["-high"]);
    assertEquals(manifest.env, { "VAR": "value" });
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("readRunManifest - reads custom profile", async (t) => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const runPath = `${tmpDir}/kintsugi/exec/editor.run.json`;
    await Deno.mkdir(`${tmpDir}/kintsugi/exec`, { recursive: true });
    await Deno.writeTextFile(runPath, JSON.stringify({
      name: "editor",
      entrypoint: "SkyrimEditor.exe",
      args: []
    }));

    const manifest = await readRunManifest(tmpDir, "editor");
    assertEquals(manifest.name, "editor");
    assertEquals(manifest.entrypoint, "SkyrimEditor.exe");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
