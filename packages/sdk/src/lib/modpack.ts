import type { BuildOptions, Shard, Source } from "../types/shard.ts";
import { hashShard } from "./hash.ts";

export interface ModlistOptions {
    name: string;
    version: string;
    mods: Shard[];
}

export async function modlist(options: ModlistOptions): Promise<Shard> {
    const { name, version, mods } = options;

    // Hash all mods and their transitive dependencies
    // First, collect all unique shards (mods + transitive deps)
    const allShards = new Map<string, Shard>();

    async function hashAndCollect(shard: Shard): Promise<Shard> {
        const hashed = await hashShard({
            name: shard.name,
            version: shard.version,
            src: shard.src,
            dependencies: shard.dependencies,
            _dependencyHashes: shard._dependencyHashes,
            permissions: shard.permissions,
            postbuild: shard.postbuild,
        });

        if (hashed.out) {
            allShards.set(hashed.out, hashed);
        }

        if (shard.dependencies) {
            const hashedDeps = await Promise.all(
                shard.dependencies.map(hashAndCollect),
            );
            hashed.dependencies = hashedDeps;
        }

        return hashed;
    }

    const hashedMods = await Promise.all(mods.map(hashAndCollect));

    const resolvedLayers = resolveTransitiveLayers(hashedMods);
    const layerHashes = resolvedLayers.map((l) => l.out).filter((out): out is string => !!out);

    const src: Source = {
        type: "composition",
        layers: layerHashes,
    };

    const drv = await hashShard({
        name,
        version,
        src,
        dependencies: resolvedLayers,
        _dependencyHashes: layerHashes,
    });

    return drv;
}

export function url(options: {
    name: string;
    version: string;
    url: string;
    sha256: string;
    unpack?: boolean;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    dependencies?: Shard[];
    postbuild?: string;
}): Shard {
    return {
        name: options.name,
        version: options.version,
        src: {
            type: "url",
            url: options.url,
            sha256: options.sha256,
            unpack: options.unpack,
            method: options.method,
            headers: options.headers,
        },
        dependencies: options.dependencies,
        postbuild: options.postbuild,
    };
}

export function local(options: {
    name: string;
    version: string;
    path: string;
    dependencies?: Shard[];
    postbuild?: string;
}): Shard {
    return {
        name: options.name,
        version: options.version,
        src: {
            type: "local",
            path: options.path,
        },
        dependencies: options.dependencies,
        postbuild: options.postbuild,
    };
}

export function json(options: {
    name: string;
    version: string;
    path: string;
    content: unknown;
    dependencies?: Shard[];
    postbuild?: string;
}): Shard {
    return {
        name: options.name,
        version: options.version,
        src: {
            type: "write_json",
            path: options.path,
            content: options.content,
        },
        dependencies: options.dependencies,
        postbuild: options.postbuild,
    };
}

export function run(options: {
    name: string;
    version: string;
    profile: string;
    entrypoint: string;
    args?: string[];
    env?: Record<string, string>;
    dependencies?: Shard[];
    postbuild?: string;
}): Shard {
    return {
        name: options.name,
        version: options.version,
        src: {
            type: "write_run",
            profile: options.profile,
            entrypoint: options.entrypoint,
            args: options.args,
            env: options.env,
        },
        dependencies: options.dependencies,
        postbuild: options.postbuild,
    };
}

export function vase(options: {
    name: string;
    version: string;
    vase: string;
    dependencies?: Shard[];
    postbuild?: string;
}): Shard {
    return {
        name: options.name,
        version: options.version,
        src: {
            type: "vase",
            vase: options.vase,
        },
        dependencies: options.dependencies,
        postbuild: options.postbuild,
    };
}

export function resolveTransitiveLayers(roots: Shard[]): Shard[] {
    const sorted: Shard[] = [];
    const visited = new Set<string>();
    const processing = new Set<string>();

    function visit(drv: Shard) {
        const out = drv.out;
        if (!out || visited.has(out)) return;
        if (processing.has(out)) {
            throw new Error(
                `Circular dependency detected involving ${drv.name} (${out})`,
            );
        }

        processing.add(out);

        if (drv.dependencies) {
            for (const dep of drv.dependencies) {
                visit(dep);
            }
        }

        processing.delete(out);
        visited.add(out);
        sorted.push(drv);
    }

    for (const root of roots) {
        visit(root);
    }

    return sorted;
}

export async function compose(
    options: BuildOptions,
): Promise<Shard> {
    const {
        name,
        layers,
        entrypoint,
        args,
        env,
        permissions,
        postbuild,
    } = options;

    // Ensure all layers have an `out` field by hashing them if needed
    const hashedLayers = await Promise.all(
        layers.map(async (layer) => {
            if (layer.out) return layer;
            return await hashShard({
                name: layer.name,
                version: layer.version,
                src: layer.src,
                dependencies: layer.dependencies,
                _dependencyHashes: layer._dependencyHashes,
                permissions: layer.permissions,
                postbuild: layer.postbuild,
            });
        }),
    );

    const resolvedLayers = resolveTransitiveLayers(hashedLayers);
    const layerHashes = resolvedLayers.map((l) => l.out).filter((out): out is string => !!out);

    const src: Source = {
        type: "composition",
        layers: layerHashes,
    };

    const drv = await hashShard({
        name,
        version: "generated",
        src,
        dependencies: resolvedLayers,
        _dependencyHashes: layerHashes,
        permissions,
        postbuild,
    });

    return drv;
}
