import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";
import { join } from "jsr:@std/path";
import type { Derivation } from "@btripoloni/kintsugi";

function sortKeysRecursively(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => sortKeysRecursively(item));
    }

    if (typeof obj !== "object") {
        return obj;
    }

    const sorted: any = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
        sorted[key] = sortKeysRecursively(obj[key]);
    }

    return sorted;
}

export async function hashDerivation(
    derivation: Derivation,
    recipesDir?: string,
): Promise<Derivation> {
    const { name, version, src, dependencies, permissions, postbuild, ...rest } = derivation;

    const toHash: any = {
        name,
        version,
        src,
        dependencies,
        permissions,
        postbuild,
        ...rest,
    };

    delete toHash.deps;
    delete toHash.out;

    const sortedToHash = sortKeysRecursively(toHash);
    const jsonString = JSON.stringify(sortedToHash);

    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = encodeHex(hashBuffer).slice(0, 32);

    const outName = `${hash}-${name}-${version}`;

    const effectiveRecipesDir = recipesDir || Deno.env.get("KINTSUGI_RECIPES_DIR");
    if (effectiveRecipesDir) {
        const fullRecipe: any = {
            out: outName,
            src,
            dependencies,
            permissions,
            postbuild,
        };

        const path = join(effectiveRecipesDir, `${outName}.json`);
        try {
            await Deno.writeTextFile(path, JSON.stringify(fullRecipe, null, 2));
        } catch (e) {
            console.error("Failed to write recipe:", e);
        }
    }

    return {
        ...rest,
        name,
        version,
        src,
        dependencies,
        permissions,
        postbuild,
        out: outName,
    };
}