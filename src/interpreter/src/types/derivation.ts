export type Source = import("./source.ts").Source;

export interface Derivation {
    name: string;
    version: string;
    src: Source;
    out?: string;
    dependencies?: string[];
    deps?: Derivation[];
    permissions?: string[];
    postbuild?: string;
}

export interface BuildOptions {
    name: string;
    layers: Derivation[];
    entrypoint?: string;
    args?: string[];
    env?: Record<string, string>;
    permissions?: string[];
    postbuild?: string;
}
