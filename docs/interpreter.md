# Interpretador (Deno/TypeScript)

O interpretador é responsável por executar expressões TypeScript e gerar receitas JSON para o compilador.

## 1. Visão Geral

O interpretador usa Deno como runtime, executado pelo executor via:
```bash
deno run --allow-read --allow-write interpreter/mod.ts <caminho-do-modpack>
```

## 2. Entrada e Saída

**Entrada:**
- Caminho para pasta do modpack (contendo `modpack.json` e `expression.ts`)

**Saída:**
- Arquivos JSON em `/recipes/[hash].json`
- Retorna hash da receita raiz para stdout

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

## 4. Exemplo de Expressão

```typescript
// expression.ts
import { mkLocal, mkUrl, mkBuild } from "modman/mod.ts";

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

## 5. Geração de Hash

O interpretador calcula a hash de cada receita:
1. Serializa a receita para JSON (sem campo `out`)
2. Calcula SHA256 do texto
3. Trunca para 32 caracteres
4. Preenche o campo `out`: `[hash]-[nome]-[versão]`

## 6. Estrutura de Arquivos

```
interpreter/
├── deno.json          # Configuração e imports
├── mod.ts             # Entry point
├── lib/
│   ├── derivation.ts  # Tipos e funções base
│   ├── sources.ts     # mkLocal, mkUrl
│   ├── build.ts       # mkBuild
│   └── hash.ts        # Cálculo de hash
```
## 7. Helpers específicos por jogo
Cada jogo deve ter um repositorio separado que ira conter os helpers especificos para ele, junto de expressões que serão usadas como pacotes para os mods.