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

As expressões usam funções fornecidas pela biblioteca padrão:

### 3.1 Funções de Source

```typescript
// Copia arquivos de um diretório local
mkLocal(name: string, version: string, path: string): Derivation

// Baixa e extrai arquivo de URL
mkUrl(name: string, version: string, url: string, sha256: string, run?: string): Derivation

// Compõe derivações em layers
mkBuild(options: BuildOptions): Derivation
```

### 3.2 Tipos

```typescript
interface Derivation {
  out: string;        // [hash]-[nome]-[versão]
  src: Source;
  dependencies?: string[];
  permissions?: ("network")[];
}

interface BuildOptions {
  name: string;
  layers: Derivation[];
  entrypoint: string;
  umu?: string;
  args?: string[];
  env?: Record<string, string>;
  permissions?: string[];
  postbuild?: string;
}
```

## 4. Exemplo de Expressão (main.ts)
As funções `mkLocal`, `mkUrl`, `mkBuild` são disponibilizadas pela runtime do Kintsugi.

```typescript
// main.ts
import { mkLocal, mkUrl, mkBuild } from "kintsugi/lib.ts"; // ou caminho equivalente fornecido pelo ambiente

const game = mkLocal("skyrimse", "1.6.117", "/games/skyrim");

const skse = mkUrl(
  "skse",
  "2.6.5",
  "https://skse.silverlock.org/beta/skse64_2_06_05.7z",
  "abc123..."
);

export default mkBuild({
  name: "meu-modpack",
  layers: [game, skse],
  entrypoint: "skse64_loader.exe",
  umu: "1.3.0",
});
```