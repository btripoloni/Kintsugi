# Kintsugi - Documento de Desenvolvimento Completo

## 1. Visão Geral do Projeto

**Kintsugi** é um gerenciador de modlists declarativo, reproduzível e isolado para jogos, inspirado no Nix. Escrito em TypeScript usando Deno como runtime.

### 1.1 Princípios Fundamentais
- **Declarativo**: Você descreve o estado final desejado, o Kintsugi se encarrega de alcançá-lo
- **Reproduzível**: Uma build é uma função pura de suas entradas - qualquer pessoa produz instalação idêntica
- **Isolado**: Cada build é autocontida e imutável no "Store", permitindo múltiplas versões e rollbacks

### 1.2 Componentes Principais

| Componente | Responsabilidade |
|------------|-------------------|
| **Interpretador** | Executa expressões TypeScript (`main.ts`) e gera receitas JSON |
| **Compilador** | Lê receitas, baixa fontes, monta builds no Store |
| **Executor** | Orquestra interpretador + compilador, fornece CLI (`run`, `build`, etc) |

### 1.3 Fluxo de Trabalho
```
Expressão (TS) -> Receita (JSON) -> Build (Store)
```

---

## 2. Estrutura de Diretórios

### 2.1 Diretório do Kintsugi (`~/.kintsugi/`)
```
~/.kintsugi/
├── modlists/      # Modlists do usuário (cada uma com main.ts, deno.json)
├── recipes/       # Receitas JSON geradas pelo interpretador
├── vases/         # Assets grandes/imutáveis (jogos base)
└── store/         # Shards construídos (~/.kintsugi/store/[hash]-[nome]-[versão])
```

### 2.2 Estrutura de uma Modlist
```
meu-modlist/
├── modlist.json    # Metadados (apenas nome por enquanto)
├── main.ts         # Definição da modlist (TypeScript)
└── deno.json       # Configuração Deno (imports opcionais)
```

---

## 3. Interface da Linha de Comando (CLI)

### 3.1 Comandos Disponíveis

| Comando | Descrição |
|---------|------------|
| `kintsugi init <name>` | Cria nova modlist com `main.ts` e `deno.json` |
| `kintsugi build` | Executa interpretador + compilador para construir a modlist |
| `kintsugi run <modlist> [profile]` | Executa a modlist (profile default: "default") |
| `kintsugi gc [--dry-run]` | Garbage Collector - remove shards não utilizados |
| `kintsugi vase add <name> <path>` | Adiciona um Vase (arquivos grandes pré-existentes) |
| `kintsugi vase remove <name>` | Remove um Vase |
| `kintsugi vase list` | Lista todos os Vases |

### 3.2 CLIs Internas

Estas são chamadas internamente pelo `build`, não são comandos diretos:

| CLI | Descrição |
|-----|------------|
| `kintsugi интерпретатор <main.ts>` | Executa main.ts e gera receitas JSON |
| `kintsugi compilador <recipe>` | Compila uma receita específica (lê recipe, baixa fontes, cria entrada no store) |

### 3.3 Usage Detalhado

**init:**
```
kintsugi init <name> [--force]
```

**build:** (executa dentro da pasta da modlist)
```
kintsugi build
```

**run:**
```
kintsugi run <modlist-name> [profile] [--root <kintsugi-root>]
# Exemplo: kintsugi run skyrim default
```

**gc:**
```
kintsugi gc --dry-run    # Simula, não apaga nada
kintsugi gc              # Executa cleanup
```

---

## 4. O Arquivo main.ts

### 4.1 Estrutura

O `main.ts` deve exportar um objeto que representa a modlist. A estrutura é:

```typescript
interface Derivation {
  name: string;           // Nome descritivo (ex: "skyrim-se")
  version: string;        // Versão (ex: "1.6.1170")
  out: string;           // Output hash format: "[hash]-[name]-[version]"
  src: Source;           // Fonte do conteúdo
  dependencies?: string[]; // Lista de nomes de receitas (formato: "[hash]-[nome]-[versão]")
  postbuild?: string;     // Script shell executado após aquisição da source
}
```

### 4.2 Tipos de Source (src)

Cada Source define como o conteúdo inicial é adquirido ou gerado. O Kintsugi utiliza um sistema modular de Fontes.

#### 4.2.1 Source: URL
Baixa um arquivo ou pacote de uma URL remota.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `url` | string | Sim | A URL para o download |
| `sha256` | string | Sim | Hash SHA256 para verificação de integridade |
| `unpack` | boolean | Não | Descompacta automaticamente se for `.zip`, `.tar`, etc. |
| `method` | `"GET" \| "POST"` | Não | Método HTTP (padrão: GET) |
| `headers` | `Record<string, string>` | Não | Headers HTTP personalizados |
| `cookies` | `Record<string, string>` | Não | Cookies para autenticação |
| `body` | string | Não | Corpo da requisição (para POST) |

**Exemplo:**
```typescript
{
  type: "url",
  url: "https://example.com/mod.zip",
  sha256: "abc123...",
  unpack: true
}
```

#### 4.2.2 Source: Local
Importa arquivos ou diretórios do sistema de arquivos local.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `path` | string | Sim | Caminho para o arquivo ou diretório, relativo à raiz do modlist |

**Nota:** O arquivo em `path` é copiado para a raiz da pasta de output da compilação.

**Exemplo:**
```typescript
{
  type: "local",
  path: "./configs/myconfig.ini"
}
```

#### 4.2.3 Source: Write JSON
Serializa um objeto para um arquivo `.json`.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `path` | string | Sim | Nome do arquivo (ex: `"config"`) |
| `content` | any | Sim | Objeto serializável |

**Exemplo:**
```typescript
{
  type: "write_json",
  path: "kintsugi/exec/default",
  content: {
    name: "default",
    entrypoint: "skse64_loader.exe",
    umu: { version: "GE-Proton9-4", id: "489830" },
    args: ["-high"],
    env: {}
  }
}
```

#### 4.2.4 Source: Vase
Importa conteúdo de uma coleção global Vase (arquivos grandes pré-existentes).

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `vase` | string | Sim | Nome do Vase registrado (ex: `"skyrim-assets"`) |

**Exemplo:**
```typescript
{
  type: "vase",
  vase: "skyrim-se-1.6.1170"
}
```

#### 4.2.5 Source: Composition
Compõe múltiplos shards em camadas para formar uma modlist.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `layers` | string[] | Sim | Lista de nomes de receitas em ordem de montagem |

**Nota:** A ordem das camadas define a prioridade. O último layer sobrescreve arquivos anteriores em caso de conflito.

**Exemplo:**
```typescript
{
  type: "composition",
  layers: [
    "87d173fde2a310f689e131926624283b-skyrimse-1.16.1170",
    "aa322c36a09e696d40f84215bdb8770e-run-spec-launcher-1.0.0",
    "0841c53c2c1377ecdcd5e68ef52c7ac4-skse-2.2.6",
  ]
}
```

### 4.3 Exemplo de main.ts

```typescript
export default {
  name: "meu-modlist",
  version: "1.0.0",
  out: "./output",
  src: {
    type: "composition",
    layers: [
      "87d173fde2a310f689e131926624283b-skyrimse-1.16.1170",
      "aa322c36a09e696d40f84215bdb8770e-run-spec-launcher-1.0.0",
      "0841c53c2c1377ecdcd5e68ef52c7ac4-skse-2.2.6",
    ]
  }
} satisfies Derivation;
```

---

## 5. O Interpretador

### 5.1 Responsabilidade
Executar o `main.ts` e transformar o resultado em arquivos de receita JSON.

### 5.2 Fluxo

1. Recebe caminho do arquivo `main.ts`
2. Executa o arquivo com Deno
3. Recebe o resultado (objeto Derivation)
4. Gera hash SHA-256 (truncado para 32 caracteres) do objeto
5. Salva receita em `~/.kintsugi/recipes/[hash]-[nome]-[versão].json`
6. Retorna o hash da receita raiz para o executor

### 5.3 Saída do Interpretador (receita JSON)

```json
{
  "root": "[hash]-[nome]-[versão]",
  "recipes": [
    {
      "out": "[hash]-[nome]-[versão]",
      "src": { "type": "...", ... },
      "dependencies": ["hash-dep1", "hash-dep2"],
      "postbuild": "script shell opcional"
    }
  ]
}
```

### 5.4 Resolução de Dependências

O interpretador usa **ordenação topológica** (DFS) para resolver dependências:
- Dependências sempre vêm antes dos dependentes
- Deduplicação automática (game aparece apenas uma vez)
- Falha se houver dependências circulares

---

## 6. O Compilador

### 6.1 Responsabilidade
Ler receitas e produzir entradas no Store (shards construídos).

### 6.2 Características
- **Agnóstico ao jogo**: Não sabe o que é Skyrim, Minecraft, etc
- **Determinístico**: Mesma receita = mesmo resultado
- **Apenas segue instruções**: Baixa arquivos, copia, cria links, executa scripts

### 6.3 Fluxo de Build

1. Recebe hash da receita raiz do interpretador
2. Verifica se a entrada já existe no Store (cache)
3. Se não existe:
   - Cria sandbox temporário
   - Executa a Source (baixa/copia arquivos)
   - Resolve dependências (hard links dos shards)
   - Executa postbuild (script shell)
   - Move resultado para Store (`[hash]-[nome]-[versão]`)
4. Cria composição (hard links ordenados dos layers)
5. Cria link simbólico `active` apontando para a build

### 6.4 Estrutura do Store

```
store/
├── [hash]-[nome]-[versão]/   # Shards individuais
│   └── ...arquivos do shard...
└── recipes/
    └── [hash]-[nome]-[versão].json  # Arquivos de receita
```

### 6.5 Nome das Entradas

O formato é sempre: `[sha256-32chars]-[nome]-[versão]`
- Hash truncado para 32 caracteres para legibilidade
- Nome e versão definidos na Derivation

---

## 7. Execução (Run)

### 7.1 Preparação do Ambiente

O Executor usa **OverlayFS** (via fuse-overlayfs) para permitir escrita em ambiente imutável:

```
~/.kintsugi/modlists/<nome>/
├── active -> /store/[hash]-composition/  (link simbólico)
├── upperlayer/  (dados persistentes: saves, configs, logs)
├── worklayer/   (interno do OverlayFS)
├── merged/      (ponto de montagem final)
└── prefix/      (WINEPREFIX para jogos Windows)
```

### 7.2 Camadas do Overlay

- **Lower**: Composição imutável do Store (somente leitura)
- **Upper**: Dados persistentes do modlist
- **Work**: Diretório de trabalho interno
- **Merged**: Visão unificada (onde o jogo executa)

### 7.3 Artefatos de Execução

Cada composição contém `kintsugi/exec/[profile].run.json`:

```json
{
  "name": "default",
  "entrypoint": "skse64_loader.exe",
  "umu": { "version": "GE-Proton9-4", "id": "489830" },
  "args": ["-high"],
  "env": {}
}
```

### 7.4 Estratégias de Execução

| Tipo | Descrição |
|------|------------|
| **Nativo** | Executa binário Linux diretamente |
| **UMU** | Usa UMU-Launcher (Proton/Wine) para jogos Windows |

### 7.5 Variáveis de Ambiente Exportadas

- `KINTSUGI_ROOT`: Caminho absoluto para pasta merged
- `KINTSUGI_MODLIST_NAME`: Nome do modlist
- `KINTSUGI_BUILD_HASH`: Hash da composição ativa

---

## 8. Vases

### 8.1 Conceito
Containers para arquivos grandes e imutáveis (ex: instalação de jogo). Usam **hard links** em vez de cópia, economizando espaço.

### 8.2 Diferença para Shards

| Aspecto | Shard | Vase |
|--------|-------|------|
| Processo | Build (download, patch, etc) | Pré-existente |
| Usage typical | Mods, configurações | Jogos base |
| Criação | Automático via receita | Manual via CLI |

### 8.3 Comandos

```bash
kintsugi vase add skyrim-se-1.6.1170 /path/to/game
kintsugi vase remove skyrim-se-1.6.1170
kintsugi vase list
```

### 8.4 Regras de Negócio

#### 8.4.1 Nomenclatura Automática
Vases criados com nome base "skyrim" recebem sufixo numérico automático:
- Primeiro "skyrim" → "skyrim-1"
- Segundo "skyrim" → "skyrim-2"
- E assim sucessivamente

#### 8.4.2 Armazenamento
Vases são armazenados em `~/.kintsugi/vases/<name>/` (diferente de store/ e recipes/).

#### 8.4.3 Comportamento do Fetcher
Ao usar um vase em uma receita, cada ARQUIVO é linkado individualmente para o output, mantendo a estrutura de diretórios original. O vase em si nunca é linkado como um todo.

#### 8.4.4 Hardlinks
- Cópia de pasta inteira via hardlinks arquivo por arquivo
- Preserva estrutura de diretórios
- Erros AlreadyExists removem e recriam o link (mesmo padrão de composition.ts)

---

## 9. Garbage Collector

### 9.1 Responsabilidade
Remover shards, receitas e builds não utilizados para liberar espaço.

### 9.2 O que é considerado "lixo"

- Builds não vinculadas a nenhum modlist
- Entradas no Store não usadas por nenhuma build
- Receitas órfãs (sem entrada correspondente no Store)

### 9.3 Comandos

```bash
kintsugi gc --dry-run  # Simula sem apagar
kintsugi gc           # Executa cleanup
```

---

## 10. Build e Rollback

### 10.1 Builds
Cada execução de `kintsugi build` cria uma nova build:
- Mantém histórico de todas as builds
- Permite rollback para versão anterior
- Permite testar mudanças sem perder configuração atual

### 10.2 Rollback
Muda o link simbólico `active` para apontar para build anterior.

---

## 11. Detalhes Técnicos

### 11.1 Hash Generation
- Algoritmo: SHA-256
- Comprimento: 32 caracteres (truncado)
- Baseado no objeto Derivation serializado
- Chaves ordenadas recursivamente antes de serializar

### 11.2 Postbuild
Script shell executado após aquisição da Source, dentro do sandbox de build.

---

## 12. Stack Tecnológico

- **Runtime**: Deno 2.0+
- **Linguagem**: TypeScript
- **Sistema de Arquivos**: OverlayFS via fuse-overlayfs
- **Execução Windows**: UMU-Launcher (Proton/Wine)
- **Pacotes**: JSR (@btripoloni/kintsugi - temporariamente ignorado)

---

## 13. Observações Importantes

1. O pacote `jsr:@btripoloni/kintsugi` existe mas será reescrito quando o repo se tornar turborepo
2. O arquivo `modlist.json` por enquanto só contém o nome da modlist
3. O comando `build` executa interpretador + compilador automaticamente
4. O CLI atual tem 3 comandos principais: init, build, run (gc/vase mencionados na docs mas não implementados no código atual)
5. O projeto é específico para Linux (usa fuse-overlayfs, namespaces)

---

## 14. Arquitetura do Código Fonte

```
src/
├── cli/                           # Interface de linha de comando
│   ├── main.ts                    # Entry point do CLI
│   ├── commands/
│   │   ├── init.ts                # Comando: init
│   │   ├── compile.ts             # Comando: compile
│   │   └── run.ts                 # Comando: run
│   └── tests/
├── interpreter/                   # Interpretador de expressões TS
│   └── src/
│       ├── types/
│       │   ├── derivation.ts      # Tipos Derivation, BuildOptions
│       │   ├── source.ts          # Tipos de Source
│       │   └── environment.ts     # Tipos de execução
│       └── lib/
│           ├── modpack.ts         # Resolução de dependências
│           ├── hash.ts            # Geração de hash
│           └── environment.ts     # Leitura de config de execução
├── compiler/                      # Compilador (monta builds)
│   └── src/
│       ├── sources/               # Implementação das Sources
│       │   ├── url.ts
│       │   ├── local.ts
│       │   ├── json.ts
│       │   └── composition.ts
│       ├── store/                 # Gerenciamento do Store
│       │   └── store.ts
│       └── types/
│           ├── recipe.ts          # Tipo Recipe
│           └── fetchers.ts        # Tipos de Fetcher
└── core/                          # Core compartilhado
    └── executor/
        └── executor.ts            # Execução com OverlayFS
```

---

## 15. Fluxo de Desenvolvimento

### 15.1 Tarefas Prioritárias (baseado no código atual)

1. **Completar CLI**: Implementar comandos `build`, `gc`, `vase`, `modlist`
2. **Implementar interpretador**: Conexão entre main.ts e geração de receitas
3. **Completar compilador**: Resolução completa de dependências, postbuild
4. **GC**: Implementar coleta de lixo
5. **Vases**: Sistema de gerenciamento de Vases

### 15.2 Testes

- Usar Deno test: `deno test ./src/`
- Estrutura: arquivos `*_test.ts` no mesmo diretório da implementação
- Setup: `t.tempDir()` para arquivos temporários

### 15.3 Verificação

Sempre executar antes de submeter:
```bash
deno check ./src/
deno fmt ./src/
```
