export interface FetchUrl {
  type: "fetch_url";
  url: string;
  sha256: string;
  unpack?: boolean;
  method?: "GET" | "POST";       // <--- Adicionado
  headers?: Record<string, string>; // <--- Adicionado
  cookies?: Record<string, string>; // <--- Adicionado
  body?: string;                 // <--- Adicionado
  postFetch?: string;
}

export interface FetchGit {
  type: "fetch_git";
  url: string;
  rev?: string;
  ref?: string;
  postFetch?: string;
}

export interface FetchLocal {
  type: "fetch_local";
  path: string;
  exclude?: string[];
  postFetch?: string;
}

export interface FetchVase {
  type: "fetch_vase";
  vase: string;
}

export interface WriteText {
  type: "write_text";
  path: string;
  content: string;
}

export interface WriteJson {
  type: "write_json";
  path: string;
  content: unknown;
}

export interface WriteToml {
  type: "write_toml";
  path: string;
  content: unknown;
}

export interface FetchBuild {
  type: "fetch_build";
  layers: string[];
  entrypoint?: string;
  umu?: string;
  args?: string[];
  env?: Record<string, string>;
  permissions?: string[];
}

export interface RunInBuild {
  type: "run_in_build";
  build: Derivation; // No TS usamos o objeto, o compilador converte para hash depois
  command: {
    entrypoint: string;
    args?: string[];
    umu?: { version: string; id: string };
  };
  outputs: string[];
}

export interface BlankSource {
  type: "blank_source";
  // This source is intentionally blank and ignored by the compiler
  // It serves as a placeholder for shards to be inserted later
}

export type Source =
  | FetchUrl
  | FetchGit
  | FetchLocal
  | FetchVase
  | WriteText
  | WriteJson
  | WriteToml
  | FetchBuild
  | RunInBuild
  | BlankSource;

export interface Derivation {
    name: string;
    version: string;
    out: string; // [hash]-[name]-[version]
    src: Source;
    dependencies?: string[]; // Hashes of dependencies (used for recipe JSON)
    deps?: Derivation[];     // Full objects (used for internal resolution)
    permissions?: string[];
    postbuild?: string;
}

export interface BuildOptions {
    name: string;
    layers: Derivation[];    // Can be a list of roots or individual layers
    entrypoint?: string;
    umu?: string;
    args?: string[];
    env?: Record<string, string>;
    permissions?: string[];
    postbuild?: string;
}
