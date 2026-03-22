export interface Derivation {
  name: string;
  version: string;
  out: string;
  src: Source;
  dependencies?: string[];
  deps?: Derivation[];
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

export type Source = import("./source.ts").Source;
