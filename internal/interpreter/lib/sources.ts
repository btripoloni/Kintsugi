import { Derivation } from "./types.ts";
import { hashDerivation } from "./hash.ts";

export interface BaseShard {
  name: string;
  version: string;
  deps?: Derivation[];
}

export interface LocalShard extends BaseShard {
  path: string;
  exclude?: string[];
  postFetch?: string;
}

export interface UrlShard extends BaseShard {
  url: string;
  sha256: string;
  unpack?: boolean;
  postFetch?: string;
}

export interface GitShard extends BaseShard {
  url: string;
  rev?: string;
  ref?: string;
  postFetch?: string;
}

export interface VaseShard extends BaseShard {
  vase: string;
}

export interface WriteTextShard extends BaseShard {
  path: string;
  content: string;
}

export interface WriteJsonShard extends BaseShard {
  path: string;
  content: unknown;
}

export interface WriteTomlShard extends BaseShard {
  path: string;
  content: unknown;
}

export async function mkLocal(shard: LocalShard): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    name: shard.name,
    version: shard.version,
    deps: shard.deps,
    dependencies: shard.deps?.map(d => d.out),
    src: {
      type: "fetch_local",
      path: shard.path,
      exclude: shard.exclude,
      postFetch: shard.postFetch,
    },
  };
  return await hashDerivation(constructed_shard);
}

export async function mkUrl(shard: UrlShard): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    name: shard.name,
    version: shard.version,
    deps: shard.deps,
    dependencies: shard.deps?.map(d => d.out),
    src: {
      type: "fetch_url",
      url: shard.url,
      sha256: shard.sha256,
      unpack: shard.unpack,
      postFetch: shard.postFetch,
    },
  };
  return await hashDerivation(constructed_shard);
}

export async function mkGit(shard: GitShard): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    name: shard.name,
    version: shard.version,
    deps: shard.deps,
    dependencies: shard.deps?.map(d => d.out),
    src: {
      type: "fetch_git",
      url: shard.url,
      rev: shard.rev,
      ref: shard.ref,
      postFetch: shard.postFetch,
    },
  };
  return await hashDerivation(constructed_shard);
}

export async function mkVase(shard: VaseShard): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    name: shard.name,
    version: shard.version,
    deps: shard.deps,
    dependencies: shard.deps?.map(d => d.out),
    src: {
      type: "fetch_vase",
      vase: shard.vase,
    },
  };
  return await hashDerivation(constructed_shard);
}

export async function writeText(shard: WriteTextShard): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    name: shard.name,
    version: shard.version,
    deps: shard.deps,
    dependencies: shard.deps?.map(d => d.out),
    src: {
      type: "write_text",
      path: shard.path,
      content: shard.content,
    },
  };
  return await hashDerivation(constructed_shard);
}

export async function writeJson(shard: WriteJsonShard): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    name: shard.name,
    version: shard.version,
    deps: shard.deps,
    dependencies: shard.deps?.map(d => d.out),
    src: {
      type: "write_json",
      path: shard.path,
      content: shard.content,
    },
  };
  return await hashDerivation(constructed_shard);
}

export async function writeToml(shard: WriteTomlShard): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    name: shard.name,
    version: shard.version,
    deps: shard.deps,
    dependencies: shard.deps?.map(d => d.out),
    src: {
      type: "write_toml",
      path: shard.path,
      content: shard.content,
    },
  };
  return await hashDerivation(constructed_shard);
}

// Function to generate a shard(derivation) this function will be used to make high level functions
export async function makeShard(shard: Omit<Derivation, "out">): Promise<Derivation> {
  return await hashDerivation(shard);
}