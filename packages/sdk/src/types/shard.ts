import type {
    Composition,
    CompositionLayer,
    FetchLocal,
    FetchNexus,
    FetchUrl,
    FetchVase,
    WriteJson,
    WriteRun,
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

export type Source = FetchUrl | FetchLocal | FetchNexus | WriteJson | Composition | FetchVase | WriteRun;

export interface BuildOptions {
    name: string;
    layers: Shard[];
    entrypoint?: string;
    args?: string[];
    env?: Record<string, string>;
    permissions?: string[];
    postbuild?: string;
}
