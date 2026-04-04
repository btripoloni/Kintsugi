import type { Shard, Source } from "../types/shard.ts";

function sortKeysRecursively(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => sortKeysRecursively(item));
    }
    if (typeof obj !== "object") {
        return obj;
    }
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
        sorted[key] = sortKeysRecursively((obj as Record<string, unknown>)[key]);
    }
    return sorted;
}

export async function hashShard(data: {
    name: string;
    version: string;
    src: Source;
    dependencies?: Shard[];
    _dependencyHashes?: string[];
    permissions?: string[];
    postbuild?: string;
}): Promise<Shard> {
    const toHash = {
        name: data.name,
        version: data.version,
        src: data.src,
        _dependencyHashes: data._dependencyHashes,
        permissions: data.permissions,
        postbuild: data.postbuild,
    };

    const sortedToHash = sortKeysRecursively(toHash);
    const jsonString = JSON.stringify(sortedToHash);

    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(jsonString),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

    return {
        out: `${hash}-${data.name}-${data.version}`,
        name: data.name,
        version: data.version,
        src: data.src,
        dependencies: data.dependencies,
        _dependencyHashes: data._dependencyHashes,
        permissions: data.permissions,
        postbuild: data.postbuild,
    };
}
