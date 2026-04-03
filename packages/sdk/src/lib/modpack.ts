import type { BuildOptions, Shard, Source } from "../types/shard.ts";
import { hashShard } from "./hash.ts";

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
