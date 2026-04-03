import type { BuildOptions, Shard, Source } from "@btripoloni/kintsugi";
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

        if (drv.deps) {
            for (const dep of drv.deps) {
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

    const resolvedLayers = resolveTransitiveLayers(layers);
    const layerHashes = resolvedLayers.map((l) => l.out).filter((out): out is string => !!out);

    const src: Source = {
        type: "composition",
        layers: layerHashes,
    };

    const drv = await hashShard({
        name,
        version: "generated",
        src,
        dependencies: layerHashes,
        deps: resolvedLayers,
        permissions,
        postbuild,
    });

    return drv;
}
