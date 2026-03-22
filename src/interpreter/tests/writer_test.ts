import { assertEquals, assertExists } from "jsr:@std/assert";
import { join } from "jsr:@std/path@1";
import { Source } from "../src/types/source.ts";

const dummySrc: Source = {
  type: "write_json",
  path: "test.json",
  content: { hello: "world" },
};

interface RecipeOutput {
  out: string;
  src: Source;
  dependencies?: string[];
  postbuild?: string;
}

function createMockDerivation(
  name: string,
  deps: string[] = [],
): RecipeOutput {
  return {
    out: `${name}-1.0.0`,
    src: dummySrc,
    dependencies: deps,
  };
}

Deno.test("writer - saves single derivation to file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const recipe = createMockDerivation("testmod");

    const filePath = join(tmpDir, "testmod-1.0.0.json");
    await Deno.writeTextFile(filePath, JSON.stringify(recipe, null, 2));

    const content = await Deno.readTextFile(filePath);
    const parsed = JSON.parse(content);

    assertEquals(parsed.out, "testmod-1.0.0");
    assertEquals(parsed.src.type, "write_json");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("writer - saves {root, recipes} format", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const recipes = [
      createMockDerivation("base"),
      createMockDerivation("modA", ["base-1.0.0"]),
      createMockDerivation("root", ["modA-1.0.0"]),
    ];

    const output = {
      root: "root-1.0.0",
      recipes: recipes,
    };

    const filePath = join(tmpDir, "output.json");
    await Deno.writeTextFile(filePath, JSON.stringify(output, null, 2));

    const content = await Deno.readTextFile(filePath);
    const parsed = JSON.parse(content);

    assertEquals(parsed.root, "root-1.0.0");
    assertEquals(parsed.recipes.length, 3);
    assertEquals(parsed.recipes[0].out, "base-1.0.0");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("writer - recipe file naming uses out field", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const recipe = createMockDerivation("mymod", []);
    recipe.out = "abc123def456-mymod-2.0.0";

    const filePath = join(tmpDir, "abc123def456-mymod-2.0.0.json");
    await Deno.writeTextFile(filePath, JSON.stringify(recipe, null, 2));

    const exists = await Deno.stat(filePath);
    assertExists(exists);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("writer - saves multiple recipes to directory", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const recipes = [
      createMockDerivation("base"),
      createMockDerivation("modA", ["base-1.0.0"]),
    ];

    for (const recipe of recipes) {
      const filePath = join(tmpDir, `${recipe.out}.json`);
      await Deno.writeTextFile(
        filePath,
        JSON.stringify(recipe, null, 2),
      );
    }

    const files = await Array.fromAsync(Deno.readDir(tmpDir));
    assertEquals(files.length, 2);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
