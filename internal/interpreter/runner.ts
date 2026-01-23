import { join } from "jsr:@std/path@1";
import { ensureDir } from "jsr:@std/fs@1";
import { Derivation } from "jsr:@btripoloni/kintsugi";

async function main() {
    const args = Deno.args;
    if (args.length < 1) {
        console.error("Usage: kintsugi-runner <path-to-modpack>");
        Deno.exit(1);
    }

    const modpackPath = args[0];
    const mainTsPath = join(modpackPath, "main.ts");
    const recipesDir = join(Deno.env.get("HOME") || "", ".kintsugi", "recipes");
    Deno.env.set("KINTSUGI_RECIPES_DIR", recipesDir);

    // Ensure recipes directory exists
    await ensureDir(recipesDir);

    try {
        // Dynamic import of the user's main.ts
        const module = await import(`file://${mainTsPath}`);

        if (!module.default) {
            console.error("Error: main.ts must export a default Derivation (mkComposition result).");
            Deno.exit(1);
        }

        const rootDerivation: Derivation = await module.default;

        console.log(rootDerivation.out); // Output root hash for executor

    } catch (err) {
        console.error("Failed to execute main.ts:", err);
        Deno.exit(1);
    }
}

if (import.meta.main) {
    main();
}
