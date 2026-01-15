import { Derivation } from "./types.ts";
import { hashDerivation } from "./hash.ts";

// --- Tipagens das Fontes (Biblioteca sources) ---

export interface FetchUrlArgs {
  url: string;
  sha256: string;
  unpack?: boolean;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: string;
}

export interface FetchLocalArgs {
  path: string;
  exclude?: string[];
  postFetch?: string;
}

export interface FetchVaseArgs {
  vase: string;
}

export interface WriteContentArgs {
  path: string;
  content: unknown;
}

export interface RunInBuildArgs {
  build: Derivation;
  command: {
    entrypoint: string;
    args?: string[];
    umu?: { version: string; id: string };
  };
  outputs: string[];
}

// --- Objeto de Biblioteca: sources ---
// Usado para definir a propriedade 'src' de um shard

export const sources = {
  fetch_url: (args: FetchUrlArgs) => ({
    type: "fetch_url" as const,
    ...args,
  }),

  fetch_local: (args: FetchLocalArgs) => ({
    type: "fetch_local" as const,
    ...args,
  }),

  fetch_vase: (args: FetchVaseArgs) => ({
    type: "fetch_vase" as const,
    ...args,
  }),

  write_text: (args: { path: string; content: string }) => ({
    type: "write_text" as const,
    ...args,
  }),

  write_json: (args: WriteContentArgs) => ({
    type: "write_json" as const,
    ...args,
  }),

  write_toml: (args: WriteContentArgs) => ({
    type: "write_toml" as const,
    ...args,
  }),

  run_in_build: (args: RunInBuildArgs) => {
    // O campo build é mantido como Derivation no TypeScript, mas será convertido
    // para hash (build.out) na serialização para JSON
    return {
      type: "run_in_build" as const,
      build: args.build,
      command: args.command,
      outputs: args.outputs,
    };
  },

  blank_source: () => ({
    type: "blank_source" as const,
    // This source is intentionally blank and ignored by the compiler
    // It serves as a placeholder for shards to be inserted later
  }),
};

// --- Funções de Geração de Shards ---

/**
 * Função base para gerar um Shard (derivação) a partir de uma definição.
 * Utilizada internamente e por funções de alto nível.
 */
export async function mkShard(shard: Omit<Derivation, "out">): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    ...shard,
    // Garante que as dependências sejam mapeadas para seus hashes de saída
    dependencies: shard.deps?.map(d => d.out) ?? [],
  };
  return await hashDerivation(constructed_shard);
}

/**
 * Cria um manifesto de execução (.run.json) como um Shard completo.
 * Deve ser usado diretamente na lista de layers de uma mkComposition.
 * O arquivo será criado em kintsugi/exec/[name].run.json
 */
export interface RunSpecArgs {
  name: string; // Nome do perfil de execução (ex: "default", "editor")
  entrypoint: string;
  umu?: {
    version: string;
    id: string;
  };
  args?: string[];
  env?: Record<string, string>;
}

export async function writeRunSpec(args: RunSpecArgs): Promise<Derivation> {
  // O caminho é sempre kintsugi/exec/[name].run.json
  const path = `kintsugi/exec/${args.name}.run.json`;
  
  return await mkShard({
    name: `run-spec-${args.name}`,
    version: "1.0.0",
    src: sources.write_json({
      path,
      content: {
        entrypoint: args.entrypoint,
        umu: args.umu,
        args: args.args ?? [],
        env: args.env ?? {},
      },
    }),
  });
}