import type { Source } from "../types/derivation.ts";

export async function hashDerivation(data: {
    name: string;
    version: string;
    src: Source;
    dependencies?: string[];
    deps?: unknown[];
    permissions?: string[];
    postbuild?: string;
}): Promise<Derivation> {
    const payload = JSON.stringify({
        name: data.name,
        version: data.version,
        src: data.src,
        dependencies: data.dependencies,
        permissions: data.permissions,
        postbuild: data.postbuild,
    });

    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(payload),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);

    return {
        out: `${hash}-${data.name}-${data.version}`,
        name: data.name,
        version: data.version,
        src: data.src,
        dependencies: data.dependencies,
        deps: data.deps as Derivation["deps"],
        permissions: data.permissions,
        postbuild: data.postbuild,
    };
}

export interface Derivation {
    name: string;
    version: string;
    src: Source;
    dependencies?: string[];
    deps?: Derivation[];
    permissions?: string[];
    postbuild?: string;
    out: string;
}
