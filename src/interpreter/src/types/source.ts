export interface FetchUrl {
    type: "url";
    url: string;
    sha256: string;
    unpack?: boolean;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    body?: string;
}

export interface FetchLocal {
    type: "local";
    path: string;
}

export interface WriteJson {
    type: "write_json";
    path: string;
    content: unknown;
}

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

export type Source = FetchUrl | FetchLocal | WriteJson | Composition;