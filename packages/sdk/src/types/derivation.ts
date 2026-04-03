import type { FetchUrl, FetchLocal, WriteJson, FetchVase } from "./fetchers.ts";

export interface CompositionLayer {
    name: string;
    version: string;
    src: Source;
    dependencies?: string[];
    deps?: Derivation[];
    permissions?: string[];
    postbuild?: string;
    out?: string;
}

export interface Composition {
    type: "composition";
    layers: (string | CompositionLayer)[];
}

export interface Derivation {
    name: string;
    version: string;
    src: Source;
    dependencies?: string[];
    deps?: Derivation[];
    permissions?: string[];
    postbuild?: string;
    out?: string;
}

export type Source = FetchUrl | FetchLocal | WriteJson | Composition | FetchVase;

export interface BuildOptions {
    name: string;
    layers: Derivation[];
    entrypoint?: string;
    args?: string[];
    env?: Record<string, string>;
    permissions?: string[];
    postbuild?: string;
}
