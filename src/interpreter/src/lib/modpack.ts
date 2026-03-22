import { BuildOptions, Derivation, Source } from "../types/derivation.ts";
import { hashDerivation } from "./hash.ts";

export function resolveTransitiveLayers(roots: Derivation[]): Derivation[] {
  const sorted: Derivation[] = [];
  const visited = new Set<string>();
  const processing = new Set<string>();

  function visit(drv: Derivation) {
    if (visited.has(drv.out)) return;
    if (processing.has(drv.out)) {
      throw new Error(
        `Circular dependency detected involving ${drv.name} (${drv.out})`,
      );
    }

    processing.add(drv.out);

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

export async function mkComposition(
  options: BuildOptions,
): Promise<Derivation> {
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
  const layerHashes = resolvedLayers.map((l) => l.out);

  const src: Source = {
    type: "composition",
    layers: layerHashes,
  };

  const drv = await hashDerivation({
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
