export interface BaseFetcher {
    type: string;
}

export interface FetchUrl extends BaseFetcher {
    type: "url";
    url: string;
    sha256: string;
    unpack?: boolean;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    body?: string;
}

export interface FetchLocal extends BaseFetcher {
    type: "local";
    path: string;
}

export interface WriteJson extends BaseFetcher {
    type: "write_json";
    path: string;
    content: unknown;
}

export interface CompositionLayer {
    name: string;
    version: string;
    src: Fetcher;
    dependencies?: string[];
    out?: string;
}

export interface Composition extends BaseFetcher {
    type: "composition";
    layers: (string | CompositionLayer)[];
}

export interface FetchVase extends BaseFetcher {
    type: "vase";
    vase: string;
}

export type Fetcher =
    | FetchUrl
    | FetchLocal
    | WriteJson
    | Composition
    | FetchVase;
