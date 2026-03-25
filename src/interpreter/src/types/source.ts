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

export interface Composition {
    type: "composition";
    layers: string[];
}

export type Source = FetchUrl | FetchLocal | WriteJson | Composition;
