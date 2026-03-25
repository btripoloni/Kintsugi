import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";
import { join } from "jsr:@std/path";
import { Derivation } from "../types/derivation.ts";

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
    derivation: Omit<Derivation, "out"> & { name: string; version: string },
): Promise<Derivation> {
    const { name, version, ...rest } = derivation;

    const toHash: any = {
        name,
        version,
        ...rest,
    };

    delete toHash.deps;

    const sortedToHash = sortKeysRecursively(toHash);
    const jsonString = JSON.stringify(sortedToHash);

    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = encodeHex(hashBuffer).slice(0, 32);

    const outName = `${hash}-${name}-${version}`;

    const recipesDir = Deno.env.get("KINTSUGI_RECIPES_DIR");
    if (recipesDir) {
        const fullRecipe: any = {
            out: outName,
            ...rest,
        };

        const path = join(recipesDir, `${outName}.json`);
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
        out: outName,
    };
}
