import type { Source } from "../types/shard.ts";

export async function hashShard(data: {
    name: string;
    version: string;
    src: Source;
    dependencies?: string[];
    deps?: unknown[];
    permissions?: string[];
    postbuild?: string;
}): Promise<Shard> {
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
        deps: data.deps as Shard["deps"],
        permissions: data.permissions,
        postbuild: data.postbuild,
    };
}

export interface Shard {
    name: string;
    version: string;
    src: Source;
    dependencies?: string[];
    deps?: Shard[];
    permissions?: string[];
    postbuild?: string;
    out: string;
}
