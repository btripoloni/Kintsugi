import { join } from "jsr:@std/path";
import type { Derivation } from "./types/derivation.ts";
import type { Source } from "./types/source.ts";
import { hashDerivation } from "./lib/hash.ts";

export interface InterpretationResult {
    derivation: Derivation;
    out: string;
}

export async function interpretModlist(modlistPath: string): Promise<InterpretationResult> {
    const mainTsPath = join(modlistPath, "main.ts");

    const mainModule = await import(`file://${mainTsPath}`);

    const derivation = mainModule.default as Derivation;

    if (!derivation.name || !derivation.version || !derivation.src) {
        throw new Error("Invalid derivation: name, version, and src are required");
    }

    const hashedDerivation = await hashDerivation(derivation);

    return {
        derivation: hashedDerivation,
        out: hashedDerivation.out!,
    };
}
