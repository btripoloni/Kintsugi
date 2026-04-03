import type {
    Composition,
    CompositionLayer,
    FetchLocal,
    FetchUrl,
    FetchVase,
    WriteJson,
} from "./fetchers.ts";

export { Composition, CompositionLayer };

export interface Shard {
    name: string;
    version: string;
    src: Source;
    dependencies?: Shard[];
    _dependencyHashes?: string[];
    permissions?: string[];
    postbuild?: string;
    out?: string;
}

export type Source = FetchUrl | FetchLocal | WriteJson | Composition | FetchVase;

export interface BuildOptions {
    name: string;
    layers: Shard[];
    entrypoint?: string;
    args?: string[];
    env?: Record<string, string>;
    permissions?: string[];
    postbuild?: string;
}
