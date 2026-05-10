import { assertEquals, assertExists } from "jsr:@std/assert";
import { join } from "jsr:@std/path@1";
import { hashDerivation } from "../src/lib/hash.ts";
import { resolveTransitiveLayers } from "../src/lib/modpack.ts";
import { Source } from "../src/types/source.ts";

const dummySrc: Source = {
    type: "write_json",
    path: "test.json",
    content: { hello: "world" },
};

interface ExecutorResult {
    root: string;
    recipes: Array<{
        out: string;
        src: Source;
        dependencies?: string[];
    }>;
}

Deno.test("executor - executes main.ts and returns root hash", async () => {
    const tmpDir = await Deno.makeTempDir();
    try {
        const mainTsContent = `
export default {
    name: "testmod",
    version: "1.0.0",
    src: { type: "write_json", path: "test.json", content: { hello: "world" } }
};
`;
        await Deno.writeTextFile(join(tmpDir, "main.ts"), mainTsContent);

        const mainModule = await import(join(tmpDir, "main.ts"));
        const drv = await hashDerivation({
            name: mainModule.default.name,
            version: mainModule.default.version,
            src: mainModule.default.src,
            dependencies: [],
        });

        assertExists(drv.out);
        assertEquals(drv.out.includes("testmod-1.0.0"), true);
    } finally {
        await Deno.remove(tmpDir, { recursive: true });
    }
});

Deno.test("executor - resolves transitive dependencies", async () => {
    const base = await hashDerivation({
        name: "base",
        version: "1.0.0",
        src: dummySrc,
        dependencies: [],
    });

    const dependent = await hashDerivation({
        name: "dependent",
        version: "1.0.0",
        src: dummySrc,
        dependencies: [base.out!],
        deps: [base],
    });

    const resolved = resolveTransitiveLayers([dependent]);

    assertEquals(resolved.length, 2);
    assertEquals(resolved[0].name, "base");
    assertEquals(resolved[1].name, "dependent");
});

Deno.test("executor - saves all recipes to recipes directory", async () => {
    const tmpDir = await Deno.makeTempDir();
    const recipesDir = join(tmpDir, "recipes");
    await Deno.mkdir(recipesDir, { recursive: true });

    try {
        const base = await hashDerivation({
            name: "base",
            version: "1.0.0",
            src: dummySrc,
            dependencies: [],
        });

        const dependent = await hashDerivation({
            name: "dependent",
            version: "1.0.0",
            src: dummySrc,
            dependencies: [base.out!],
            deps: [base],
        });

        const resolved = resolveTransitiveLayers([dependent]);

        for (const drv of resolved) {
            const recipeFile = join(recipesDir, `${drv.out!}.json`);
            await Deno.writeTextFile(
                recipeFile,
                JSON.stringify(
                    {
                        out: drv.out,
                        src: drv.src,
                        dependencies: drv.dependencies,
                    },
                    null,
                    2,
                ),
            );
        }

        const files = await Array.fromAsync(Deno.readDir(recipesDir));
        assertEquals(files.length, 2);

        const baseRecipe = JSON.parse(
            await Deno.readTextFile(join(recipesDir, `${base.out}.json`)),
        );
        assertEquals(baseRecipe.out, base.out);

        const dependentRecipe = JSON.parse(
            await Deno.readTextFile(
                join(recipesDir, `${dependent.out}.json`),
            ),
        );
        assertEquals(dependentRecipe.dependencies, [base.out]);
    } finally {
        await Deno.remove(tmpDir, { recursive: true });
    }
});

Deno.test("executor - handles {root, recipes} output format", async () => {
    const base = await hashDerivation({
        name: "base",
        version: "1.0.0",
        src: dummySrc,
        dependencies: [],
    });

    const root = await hashDerivation({
        name: "root",
        version: "1.0.0",
        src: dummySrc,
        dependencies: [base.out!],
        deps: [base],
    });

    const resolved = resolveTransitiveLayers([root]);

    const output: ExecutorResult = {
        root: root.out!,
        recipes: resolved.map((drv) => ({
            out: drv.out!,
            src: drv.src,
            dependencies: drv.dependencies,
        })),
    };

    assertEquals(output.root, root.out);
    assertEquals(output.recipes.length, 2);
    assertEquals(output.recipes[0].out, base.out);
    assertEquals(output.recipes[1].out, root.out);
});

Deno.test(
    "executor - saves recipe in [hash]-[name]-[version].json format",
    async () => {
        const tmpDir = await Deno.makeTempDir();
        const recipesDir = join(tmpDir, "recipes");
        await Deno.mkdir(recipesDir, { recursive: true });

        try {
            const drv = await hashDerivation({
                name: "mymod",
                version: "2.1.0",
                src: dummySrc,
                dependencies: [],
            });

            const recipeFile = join(recipesDir, `${drv.out}.json`);
            await Deno.writeTextFile(
                recipeFile,
                JSON.stringify(
                    {
                        out: drv.out,
                        src: drv.src,
                    },
                    null,
                    2,
                ),
            );

            const parts = drv.out!.split("-");
            assertEquals(parts.length, 3);
            assertEquals(parts[1], "mymod");
            assertEquals(parts[2], "2.1.0");

            const exists = await Deno.stat(recipeFile);
            assertExists(exists);
        } finally {
            await Deno.remove(tmpDir, { recursive: true });
        }
    },
);
