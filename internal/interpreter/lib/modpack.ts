import { BuildOptions, Derivation, Source } from "./types.ts";
import { hashDerivation } from "./hash.ts";

/**
 * Resolves the flat list of all transitive dependencies for a set of derivations.
 * Maintains order: dependencies come BEFORE the derivation that depends on them.
 */
export function resolveTransitiveLayers(roots: Derivation[]): Derivation[] {
    const sorted: Derivation[] = [];
    const visited = new Set<string>();
    const processing = new Set<string>();

    function visit(drv: Derivation) {
        if (visited.has(drv.out)) return;
        if (processing.has(drv.out)) {
            throw new Error(`Circular dependency detected involving ${drv.name} (${drv.out})`);
        }

        processing.add(drv.out);

        // Visit all dependencies first
        if (drv.deps) {
            for (const dep of drv.deps) {
                visit(dep);
            }
        }

        processing.delete(drv.out);
        visited.add(drv.out);
        sorted.push(drv);
    }

    for (const root of roots) {
        visit(root);
    }

    return sorted;
}

export async function mkComposition(options: BuildOptions): Promise<Derivation> {
    const { name, layers, entrypoint, umu, args, env, permissions, postbuild } = options;
    
    // Auto-resolve transitive dependencies to form the layers list
    const resolvedLayers = resolveTransitiveLayers(layers);
    const layerHashes = resolvedLayers.map(l => l.out);

    const src: Source = {
        type: "fetch_build",
        layers: layerHashes,
        entrypoint,
        umu,
        args,
        env,
        permissions,
    };

    // The 'dependencies' field in the final recipe should also contain all transitive hashes
    // to ensure the compiler can fetch everything it needs.
    const drv = await hashDerivation({
        name,
        version: "generated",
        src,
        dependencies: layerHashes,
        deps: resolvedLayers,
        permissions,
        postbuild
    });

    return drv;
}
