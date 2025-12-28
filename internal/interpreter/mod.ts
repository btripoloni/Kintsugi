import { join, dirname } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs";
import { mkComposition } from "./lib/modpack.ts";
import { sources, mkShard, writeRunSpec } from "./lib/sources.ts";
import { Derivation } from "./lib/types.ts";

// Export for main.ts usage
export { mkComposition, sources, mkShard, writeRunSpec };

async function main() {
    const args = Deno.args;
    if (args.length < 1) {
        console.error("Usage: kintsugi-interpreter <path-to-modpack>");
        Deno.exit(1);
    }

    const modpackPath = args[0];
    const mainTsPath = join(modpackPath, "main.ts");
    const modpackJsonPath = join(modpackPath, "modpack.json");
    const recipesDir = join(Deno.env.get("HOME") || "", ".kintsugi", "recipes");
    Deno.env.set("KINTSUGI_RECIPES_DIR", recipesDir);

    // Ensure recipes directory exists
    await ensureDir(recipesDir);

    try {
        // Dynamic import of the user's main.ts
        // We need to handle the fact that main.ts imports from "kintsugi/lib.ts" or similar.
        // For now, if we run this script as the runner, we might need an import map or similar.
        // OR we inject the globals? No, modules strictly import.
        // The user's main.ts will import from THIS library.
        // We assume the user has set up their environment or we provide the import map.
        // But wait, if we are running `deno run` on `main.ts`, WE are not the runner, `main.ts` IS the runner?
        // User runs: `kintsugi build` -> executes `deno run ... main.ts` ?
        // Or `kintsugi build` -> executes `deno run ... interpreter/mod.ts <path>`?
        // Design says: 
        // "O executor roda o interpretador (Deno) sobre o arquivo main.ts."
        // AND "Usuário roda kintsugi build dentro da pasta."
        // 
        // If `main.ts` exports a default function (Derivation), then we need a runner that imports it and processes the result.
        // So `kintsugi build` should probably run `interpreter/mod.ts` which imports `main.ts`.

        // We using `await import(mainTsPath)`
        const module = await import(`file://${mainTsPath}`);

        if (!module.default) {
            console.error("Error: main.ts must export a default Derivation (mkComposition result).");
            Deno.exit(1);
        }

        const rootDerivation: Derivation = await module.default;

        // Now we need to collect all derivations (recursively) and write them to recipes folder.
        // But `mkComposition` and `mkShard` return Derivations with 'out' hash.
        // They don't write to disk immediately?
        // Design says: "Gera N arquivos de receita (.json) em /recipes"
        // "Retorna hash da receita raiz para stdout"

        // We need a way to traverse the graph and write the files.
        // Or `mkShard` should register themselves in a global or similar?
        // Or we just traverse the `rootDerivation` object?
        // It has `dependencies` [hashes]. But where are the recipe definitions for those dependencies?
        // Ah! `mkComposition` returns a Derivation. The dependencies lists HASHES.
        // But the COMPILER needs the RECIPE (JSON) for those hashes.
        // If we only have the hash, we can't reconstruct the recipe!
        // So `mkShard` etc. must MUST write the recipe to disk OR we must return the full object graph.
        // IF we return just the Derivation struct which has `dependencies: string[]`, we lost the children objects.

        // CRITICAL FIX: The Derivation structure in memory must hold the children objects (or we write on creation).
        // Writing on creation is easier for a start, but might write garbage if not used.
        // But in Nix/functional style, side effects (writing) usually happen at the end.
        // However, if `mkComposition` only gets hashes from children, we can't traverse down.

        // SOLUTION: `mkShard` should write the .json file to `recipesDir` immediately when called.
        // Since this is a build-time generation step, this is acceptable.
        // The `interpreter` must know where to write. `recipesDir`.
        // We can use an environment variable `KINTSUGI_RECIPES_DIR`.

        // I will implement writes in `hash.ts` or `sources.ts` / `modpack.ts`.
        // For now, let's assume they write.

        console.log(rootDerivation.out); // Output root hash for executor

    } catch (err) {
        console.error("Failed to execute main.ts:", err);
        Deno.exit(1);
    }
}

if (import.meta.main) {
    main();
}
