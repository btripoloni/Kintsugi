# Interpretador (Deno/TypeScript)

O interpretador é responsável por executar expressões TypeScript e gerar receitas JSON para o compilador.

## 1. Visão Geral

O interpretador usa Deno como runtime, executado pelo executor via:
```bash
deno run --allow-read --allow-write interpreter/mod.ts <caminho-do-modpack>
```

## 2. Entrada e Saída

**Entrada:**
- Caminho para pasta do modpack (contendo `modpack.json` e `main.ts`)

**Saída:**
- Arquivos JSON em `/recipes/[hash]-[nome da receita]-[versão].json`
- Retorna hash da receita raiz para stdout

## 2.1 Workflow do Usuário
1. Usuário roda `kintsugi init meu-modpack`.
2. O sistema cria `~/.kintsugi/modpacks/meu-modpack/` contendo `modpack.json` e `main.ts`.
3. Usuário edita `main.ts` para definir o modpack.
4. Usuário roda `kintsugi build` dentro da pasta.
5. O executor roda o interpretador (Deno) sobre o arquivo `main.ts`.


## 3. API de Expressões

As expressões usam funções fornecidas pela biblioteca padrão do Kintsugi.

### 3.1 `mkShard`

A função `mkShard` é a principal forma de criar um "Shard", a unidade fundamental do Kintsugi.

```typescript
// Cria um Shard a partir de uma fonte
mkShard(options: ShardOptions): Promise<Shard>
```

Para a lista de fontes disponíveis, veja a [Biblioteca `sources`](./sources-library.md).

### 3.2 `mkComposition`

A função `mkComposition` é usada para compor um conjunto de Shards em uma composição final, que pode ser executada. Uma composição é essencialmente uma lista ordenada de camadas de conteúdo.

```typescript
// Compõe múltiplos Shards em camadas
mkComposition(options: CompositionOptions): Promise<Composition>
```

### 3.3 Tipos

```typescript
interface Shard {
  out: string;        // [hash]-[nome]-[versão]
  name: string;
  version: string;
  src: Source;
  dependencies?: string[];
  permissions?: string[];
  postBuild?: string;
}

interface ShardOptions {
  name: string;
  version: string;
  src: Source;
  dependencies?: Shard[];
  permissions?: string[];
  postBuild?: string;
}

// Representa a composição final de um modpack
interface Composition {
  name: string;
  layers: Shard[];
}
```

## 4. Exemplo de Expressão (main.ts)
As funções `mkShard`, `mkComposition`, `writeRunSpec`, `sources` e `bootstrap` são disponibilizadas pela runtime do Kintsugi.

```typescript
// main.ts
import { mkShard, mkComposition, writeRunSpec, sources, bootstrap } from "kintsugi";

const skyrim = await mkShard({
  name: "skyrim-se",
  version: "1.6.117",
  src: sources.fetch_vase({ vase: "skyrim-se-1.6.117" }),
});

const skse = await mkShard({
  name: "skse",
  version: "2.6.5",
  src: sources.fetch_url({
    url: "https://skse.silverlock.org/beta/skse64_2_06_05.7z",
    sha256: "abc123...",
    unpack: true,
  }),
  dependencies: [skyrim],
});

const finalComposition = await mkComposition({
  name: "meu-modpack",
  layers: [
    skyrim,
    skse,
    // Adiciona o perfil de execução `default`
    writeRunSpec({
        path: "kintsugi/exec/default.run.json",
        entrypoint: "skse64_loader.exe",
        umu: {
            version: "GE-Proton9-4",
            id: "489830",
        },
    }),
  ],
});

bootstrap(finalComposition);
```