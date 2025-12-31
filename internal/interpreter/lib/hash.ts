import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";
import { join } from "jsr:@std/path";
import { Derivation, Source } from "./types.ts";

/**
 * Recursively sorts all keys in an object to ensure deterministic JSON serialization.
 * This is critical for hash generation - the same content must always produce the same hash.
 * 
 * Note: undefined values are preserved (JSON.stringify will omit them, which is correct behavior).
 */
function sortKeysRecursively(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sortKeysRecursively(item));
    }
    
    if (typeof obj !== "object") {
        return obj;
    }
    
    // Create a new object with sorted keys
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
        sorted[key] = sortKeysRecursively(obj[key]);
    }
    
    return sorted;
}

export async function hashDerivation(derivation: Omit<Derivation, "out"> & { name: string; version: string }): Promise<Derivation> {
    // Create a copy to sort keys or ensure deterministic serialization
    const { name, version, ...rest } = derivation;

    // We hash the 'rest' (src, dependencies, permissions) + name + version ? 
    // Design says: "Gerada a partir do texto JSON da receita (sem o campo out)."
    // So we should serialize { src, dependencies, permissions, name, version? }
    // Actually, 'name' and 'version' are part of the metadata usually?
    // Let's include everything except 'out'.

    const toHash: any = {
        name,
        version,
        ...rest
    };
    
    // We must not serialize full 'deps' objects into the recipe JSON
    // @ts-ignore: deps is part of rest but we want to exclude it from serialization
    delete toHash.deps;

    // Convert run_in_build.build from Derivation to hash for serialization
    if (toHash.src && (toHash.src as Source).type === "run_in_build") {
        const runInBuild = toHash.src as any;
        if (runInBuild.build && typeof runInBuild.build === "object" && "out" in runInBuild.build) {
            toHash.src = {
                ...runInBuild,
                build: runInBuild.build.out, // Convert Derivation to hash
            };
        }
    }

    // Sort all keys recursively to ensure deterministic serialization
    const sortedToHash = sortKeysRecursively(toHash);
    
    // Deterministic JSON stringify (all keys sorted recursively)
    const jsonString = JSON.stringify(sortedToHash);

    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = encodeHex(hashBuffer).slice(0, 32); // Truncate to 32 chars

    const outName = `${hash}-${name}-${version}`;

    // Write to disk if configured
    const recipesDir = Deno.env.get("KINTSUGI_RECIPES_DIR");
    if (recipesDir) {
        const fullRecipe: any = {
            out: outName,
            ...rest
        };
        
        // Convert run_in_build.build from Derivation to hash for recipe JSON
        if (fullRecipe.src && (fullRecipe.src as Source).type === "run_in_build") {
            const runInBuild = fullRecipe.src as any;
            if (runInBuild.build && typeof runInBuild.build === "object" && "out" in runInBuild.build) {
                fullRecipe.src = {
                    ...runInBuild,
                    build: runInBuild.build.out, // Convert Derivation to hash
                };
            }
        }
        
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
