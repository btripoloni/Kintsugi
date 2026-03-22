import { assertEquals, assertExists } from "jsr:@std/assert";
import { join, dirname } from "jsr:@std/path";
import { fromFileUrl } from "jsr:@std/path";

const CLI_PATH = join(dirname(fromFileUrl(import.meta.url)), "..", "src", "main.ts");

Deno.test("CLI should compile a recipe with local source", async () => {
  const tmpDir = await Deno.makeTempDir();
  
  const storeDir = join(tmpDir, "store");
  const recipesDir = join(storeDir, "recipes");
  const modlistRoot = tmpDir;
  const outputDir = join(tmpDir, "output");
  
  await Deno.mkdir(recipesDir, { recursive: true });
  await Deno.mkdir(join(modlistRoot, "mods"), { recursive: true });
  await Deno.writeTextFile(join(modlistRoot, "mods", "my-mod.jar"), "mod content");

  const recipe = {
    out: "abc123-MyMod-1.0.0",
    src: {
      type: "local",
      path: "mods/my-mod.jar",
    },
  };

  await Deno.writeTextFile(
    join(recipesDir, "abc123-MyMod-1.0.0.json"),
    JSON.stringify(recipe),
  );

  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      CLI_PATH,
      "compile",
      "abc123-MyMod-1.0.0",
      "--store",
      storeDir,
      "--modlist",
      modlistRoot,
      "--output",
      outputDir,
    ],
    cwd: tmpDir,
  });

  const { code, stdout, stderr } = await cmd.output();

  const outputText = new TextDecoder().decode(stdout);
  const errorText = new TextDecoder().decode(stderr);

  assertEquals(code, 0, `CLI failed: ${errorText}\n${outputText}`);

  const modContent = await Deno.readTextFile(join(outputDir, "mods", "my-mod.jar"));
  assertEquals(modContent, "mod content");

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("CLI should fail when recipe not found", async () => {
  const tmpDir = await Deno.makeTempDir();
  const storeDir = join(tmpDir, "store");
  const outputDir = join(tmpDir, "output");

  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      CLI_PATH,
      "compile",
      "nonexistent-recipe",
      "--store",
      storeDir,
      "--modlist",
      tmpDir,
      "--output",
      outputDir,
    ],
    cwd: tmpDir,
  });

  const { code } = await cmd.output();

  assertEquals(code, 1);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("CLI should show help message", async () => {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      CLI_PATH,
      "--help",
    ],
  });

  const { code, stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(code, 0);
  assertExists(output.includes("kintsugi"));
  assertExists(output.includes("compile"));
});
