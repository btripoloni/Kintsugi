export interface Source {
    source: "local" | "url" | "build";
    path?: string;
    url?: string;
    sha256?: string;
    unpack?: boolean;
    run?: string;
    layers?: string[]; // Hashes of layer derivations
    entrypoint?: string;
    umu?: string;
    args?: string[];
    env?: Record<string, string>;
    permissions?: string[];
}

export interface Derivation {
    out: string; // [hash]-[name]-[version]
    src: Source;
    dependencies?: string[]; // Hashes of dependencies
    permissions?: string[];
    postbuild?: string;
}

export interface BuildOptions {
    name: string;
    layers: Derivation[];
    entrypoint?: string;
    umu?: string;
    args?: string[];
    env?: Record<string, string>;
    permissions?: string[];
    postbuild?: string;
}
