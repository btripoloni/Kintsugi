# Projeto: Mod-Manager Declarativo

## 1. Introdução e Filosofia

Este documento descreve a arquitetura de um mod manager de jogos tanto nativos quanto usando wine para Linux, usando o conceito de declaração para permitir a geração de modpacks imutaveis e reprodutíveis.
Esse mod manager é altamente inspirado no nix e nixos. pensado que cada modpack seja independente, que contem builds isoladas e imutaveis, permitindo testes e rollbacks.
O projeto ira usar Go para o compilador e executor, e Typescript(Deno) para o interpretador.
O compilador funciona de forma "burra" ele apenas executa as instruções que recebem, possibilitando que qualquer jogo possa ser gerenciado.
A logica por trás do gerenciado do jogo e seus modpacks e feita pelo codigo typescript fornecido ao interpretador.

Pontos do projeto:
- **Declarativo:** O estado final é definido, não os passos manuais.
- **Reproduzível:** Builds são funções puras dos inputs.
- **Isolado:** Gerações autocontidas e imutáveis.

Esse projeto é divido em 3 partes:
- **Interpretador:** um interpretador Javascript/Typescript que recebe expressões e gera receitas.
- **Compilador:** um compilador que recebe receitas e gera builds.
- **Executor:** um programa que executa funções simples relacionadas aos modpacks.
  - Rodar o jogo diretamente de um build.
  - Fazer rollbacks.
  - Gerenciar modpacks.
  - Gerenciar builds.
  - Limpar o lixo(garbage collection).
- **Utilitários:** um conjunto de ferramentas utilitárias que auxiliam no gerenciamento e build de modpacks(que serão definidos durante as necessidades do desenvolvimento).

Cada parte é um programa escrito separadamente, priorizando sua simplicidade e funcionalidade.

# 2. modpack.json
O arquivo sera responsavel por descrever como sera os dados basicos do modpack. silimilar aos flakes do nix, mas também com similaridados do package.json do npm.

```json
{
  "name": "nome do modpack",
  "description": "descrição do modpack",
  "author": "autor do modpack",
  "license": "licença do modpack",
  // Dependecias serão definidas nas expressões.
}
```

## 2.1 Workflow de criação de um modpack
Expressão -> Receita -> Build(composição) -> Modpack

## 2.2 Expressão
Uma expressão é um codigo em typescript que define o conteudo de um modpack, similar as expressões do nix.
Dentro das expressões, tudo relacionado ao funcionamento do modpack é declado.
Mods, arquivos de configuração, versões do jogo, dependencias, etc. 
A execussão desse codigo gera arquivos de receita que serão usados pelo compilador para gerar a ultima build um pacote que sera usado em um modpack.
Esses arquivos gerados são jogados em uma pasta chamada "recipes" que irão conter as receitas de todos os modpacks e suas dependencias.
Expressões são feitas a partir de um conjunto de funções que podem ser combinadas e extendidas para formar modulos que podem ser reutilizados, para montar modpacks de forma pratica.

## 2.3 Receita
Uma receita é um arquivo json que descreve instruções de build tanto de dependencias quando do modpack em si, nele todos os paços necessarios para fazer a build é descrito, esse arquivo é lido pelo compilador e usado para gerar a ultima build um pacote que sera usado em um modpack.

## 2.4 Compilador
O compilador é responsável por montar a próxima build de uma modpack.
Ele analiza o grafo e age conforme as instruções das receitas.
Ele é o responsável por resolver as dependências, gerenciar os arquivos dos jogos, gerenciar o store e fazer os links simbolicos para gerar a build.

Exemplo de receitas formadas por expressões e enviadas ao compilador:

```json
{
  "out": "[hash256]-skyrimse-1.6.117",
  "src": {
    "source": "local", // vai copiar todo o conteudo de uma pasta para a derivação
    "path": "/path/to/game"
  }
}
```

```json
{
  "out": "[hash256]-skse-2.6.5",
  "src": {
    "source": "url", // faz o download de um arquivo e o descompacta.
    "url": "https://github.com/loot/skse/releases/download/v2.6.5/skse-2.6.5.zip",
    "sha256": "hash256", // hash256 do arquivo
    "run": "" // shell script que será executado no final do download e extração do zip, usado caso algum processamento seja necessário.
  },
  "dependencies": [
    "[hash256]-skyrimse-1.6.117"
  ],
  "permissions": ["network"], // necessario para fazer download
}
```

```json
{
  "out": "[hash256]-[nome definido no modpack.json]-[geração]",
  // o valor de geração é incrementado a cada build.
  "dependencies": [
    "[hash256]-skyrimse-1.6.117",
    "[hash256]-skse-2.6.5",
    "[hash256]-armor1-1.0.0",
    "[hash256]-armor2-1.0.0",
    "[hash256]-plugins_txt-0.0.0",
    "[hash256]-gamepad_config-1.0.0",
  ],
  "src":{
    "source": "build",
    "layers": [
      "[hash256]-skyrimse-1.6.117",
      "[hash256]-skse-2.6.5",
      "[hash256]-armor1-1.0.0",
      "[hash256]-armor2-1.0.0",
      "[hash256]-gamepad_config-1.0.0",
      "[hash256]-plugins_txt-0.0.0",
    ],
    "umu": "1.3.0", // usará o umu launcher para gerenciar o wine/proton no momento de rodar o jogo.
    // https://github.com/Open-Wine-Components/umu-launcher
    "permissions": ["network"], // para jogos que precisam de internet para funcionar.
    "entrypoint": "skse.exe",
    "args": ["arg1", "arg2"], // opcional
    "env": {
      "VAR1": "value1",
      "VAR2": "value2"
    }, // opcional
  },
  "postbuild": "" //shell script que será executado no final da build, esse script é opcional.
}
```

## 2.5 Tipos de "sources"

### 2.5.1 Local
Local ira usar um diretório para indicar onde está os arquivos usados na devivação, ele irá copiar todos os arquivos para a pasta da derivação dentro de store "out".
### 2.5.2 URL
URL irá fazer o download de um arquivo na pasta da derivação dentro de store "out" e o descompactar.
### 2.5.3 Build
Build, dentro da pasta out vai montar os arquivos especificados na receita.
cada layer é uma entrada na store que deverá ser recursivamente inserida dentro da pasta out usando links simbolicos.
neste exemplo o resultado será os arquivos do jogo Skyrim, com as depencidas do skse, e os mods sendo sobre escritos quando algum comflito ocorrer.

Essa receita irá resolver todas as dependencias e depois fazer uma nova derivação que irá conter todos os arquivos necessarios(usando links simbolicos) para o modpack.

## 2.6 Resolução de dependencias.
O compilador sera inspirado no nix então terá comportamento similar.
Caso o hash de alguma receita esteja faltando o compilador deve parar e mostrar um erro.
caso a receita informe um hash que seja diferente do hash que foi calculado pelo compilador, o compilador deve parar o processo e mostrar qual has era esperada.

## 2.7 Resolução de conflitos.
Na monstagem das layers usando os links simbolicos, caso dois arquivos sejam iguais, o compilador sempre vai priorizar o arquivo que vier depois na ordem dos layers.

# 3. Store
Store é uma pasta que contém todos os arquivos necessários para a execussão de um modpack.
Arquivos dos mods, arquivos de configuração, versões do jogo, dependencias, etc.
Identificado por uma hash256, garantindo que o conteudo não seja duplicado.
Toda entrada no store terá o nome de derivação por se acemelhar com as derivações do nix.
o nome de uma derivação tem o padrão: [hash256]-[nome da derivação]-[versão], similar ao nix.

Junto do store, teremos um banco de dados sqlite que ajudara a guardar as hashs informações relacionadas a derivações e builds.

## 3.1 Sistema de Hashes

Existem dois tipos de hashes usados no sistema:

### 3.1.1 Hash da Receita (input-addressed)
Gerada a partir do texto JSON da receita (sem o campo `out`).
Usada para identificar derivações no store e evitar recompilação.
- Se a mesma receita for gerada novamente → mesma hash → já existe no store → SKIP
- O campo `out` da receita usa essa hash: `[hash]-[nome]-[versão]`

### 3.1.2 Hash de Conteúdo (content-addressed)
Fornecida na receita para fontes externas (url, nexus, curseforge).
Usada para verificar integridade do arquivo baixado.
- Se a hash do arquivo baixado != hash informada → ABORT + mostra hash calculada
- Obrigatório para `source: url` para garantir reprodutibilidade
- Para `source: local`, a hash pode ser opcional (confia no sistema de arquivos local)


# 4. O executor
O executor é reponsavel por gerenciar o que está em volta do modpacks, ele executara o interpretador, passara as receitas para o compilador, iniciara novos modpacks, rodara os modpacks, limpara tudo que lixo que não esta mais sendo usado.

Até o momento esses são os comandos disponiveis no executor:
- init (inicia o novo modpack)
- run (roda o jogo de um modpack)
- build (faz uma nova build)
- switch (muda para uma build antiga)
- rollback (faz um rollback para a build anterior)
- test (faz uma nova build e inicia um modpack para testes)
- gc (garbage collection)

## 4.1 Workflow de compilação de uma build.
┌─────────────────────────────────────────────────────────────────┐
│                         1. EXECUTOR                             │
│  • Lê modpack.json para identificar o modpack                   │
│  • Invoca o INTERPRETADOR passando as expressões (.ts)          │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       2. INTERPRETADOR                          │
│  • Executa o código TypeScript das expressões                   │
│  • Resolve dependências lógicas (mods, configs)                 │
│  • Gera N arquivos de receita (.json) em /recipes               │
│  • Retorna ao executor qual é a "receita raiz" do modpack       │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        3. COMPILADOR                            │
│  Recebe: hash da receita raiz                                   │
│                                                                 │
│  3.1. Carrega a receita raiz                                    │
│  3.2. Monta grafo de dependências (recursivo)                   │
│  3.3. Para cada receita no grafo (ordem topológica):            │
│       ├─ Calcula hash da receita (texto JSON)                   │
│       ├─ Se hash já existe no store → SKIP (já buildado)        │
│       └─ Se não existe:                                         │
│           ├─ Cria pasta temporária isolada (namespace)          │
│           ├─ Executa source (local/url/build) conforme receita  │
│           ├─ Se source=url: verifica sha256 do download         │
│           ├─ Se sha256 != esperada → ABORT + mostra hash real   │
│           ├─ Executa script "run" se definido                   │
│           └─ Move pasta para /store/[hash]-[nome]-[versão]      │
│  3.4. Cria a derivação final do modpack (source: build)         │
│       ├─ Gera links simbólicos para cada layer (ordem importa)  │
│       ├─ Executa "postbuild" se definido                        │
│       └─ Registra no banco: derivations, derivation_dependencies│
│  3.5. Atualiza link simbólico [nome]-actual → nova build        │
│  3.6. Atualiza tabela modpacks (active_derivation_hash)         │
└─────────────────────────────────────────────────────────────────┘

## 4.2 Ambiente de build
toda build será feita em um ambiente gerenciado por namespace. similar ao nix, rodando com permissões previamente descritas pela receita.

## 4.3 Rollback
O executor caso sejá pedido pode editar o link simbolicos para voltar a uma build antiga.

## 4.4 Rodando uma build.
O trabalho de rodar uma build é feito pelo executor.
Ele é o responsavel por montar o ambiente para o jogo.
O ambiente padrão e montado usando overlays do linux.

As layers do ambiente padrão são:
┌─────────────────────────────────────────┐
│ lowerlayer(build atual, link simbolico) │
│ upperlayer(pasta de configurações)      │
└─────────────────────────────────────────┘

O upperlayer é uma pasta que sera usada para que qualquer arquivo gerado em tempo de execussão seja salvo.
Ela será compartilhada entre todas a builds, permitindo que arquivos em tempo de execussão sejam salvos.
O upperlayer tem a propriedade de sobreescrever arquivos do lowerlayer.

## 4.5 Rodando uma build de testes.
O executor irá criar um ambiente para o jogo usando a ultima receita gerada pelo interpretador. mas esse ambiente usará uma upperlayer separada.

## 4.6 execussão do garbage collection.
O garbage collection é feito pelo executor.
Ele deve procurar as devivações que não estão mais sendo usadas por nenhuma build e removelas otimizando o espaço.
Também tera o trabalho de remover alguma devivação que seja uma build que não esta mais sendo ativa, ou seja os seus arquivos de modpack(principalmente modpack.json) não estejam mais presentes em /modpacks

# 5. sitema de pastas para o modmanager:
O sistema de pastas do modmanager deve ficar sepre na home do usuario.
- .modmanager //localizado na home do usuario
  - /store
    - /[hash256]-nome-do-modpack-gen-*
  - /recipes
  - /modpacks
    - /nome-do-modpack
      - /[hash256]-nome-do-modpack-gen-*
      - /[hash256]-nome-do-modpack-actual (link simbolicos para a ultima build)
      - /upperlayer
      - /worklayer
      - /wineprefix //caso seja um jogo windows

# 6. Tabelas no banco de dados do store:
CREATE TABLE recipes (
    hash TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    expression TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE derivations (
    hash TEXT PRIMARY KEY,
    recipe_hash TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT NOT NULL, -- build, source, or meta
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_hash) REFERENCES recipes(hash)
);

CREATE TABLE derivation_dependencies (
    derivation_hash TEXT NOT NULL,
    dependency_hash TEXT NOT NULL,
    PRIMARY KEY (derivation_hash, dependency_hash),
    FOREIGN KEY (derivation_hash) REFERENCES derivations(hash),
    FOREIGN KEY (dependency_hash) REFERENCES derivations(hash)
);

CREATE TABLE modpacks (
    name TEXT PRIMARY KEY,
    active_derivation_hash TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (active_derivation_hash) REFERENCES derivations(hash)
);

# 7. Estrutura do Projeto (Monorepo)

O projeto será desenvolvido como um monorepo com os seguintes pacotes:

```
mod-manager/
├── flake.nix                    # Ambiente de desenvolvimento Nix
├── go.work                      # Go workspace para múltiplos módulos
│
├── cmd/                         # Binários executáveis
│   ├── modman/                  # CLI principal (executor)
│   │   └── main.go
│   └── modman-compiler/         # Compilador (chamado pelo executor)
│       └── main.go
│
├── internal/                    # Código Go compartilhado (não exportado)
│   ├── store/                   # Gerenciamento do store e SQLite
│   ├── recipe/                  # Parser e validação de receitas JSON
│   ├── sandbox/                 # Namespaces e isolamento de builds
│   ├── overlay/                 # Montagem de overlayfs para runtime
│   └── hash/                    # Funções de hash (SHA256 truncado)
│
├── interpreter/                 # Interpretador TypeScript (Deno)
│   ├── deno.json                # Configuração do Deno
│   ├── mod.ts                   # Entry point
│   └── lib/                     # Funções para expressões
│       ├── sources.ts           # mkUrl, mkLocal, etc.
│       ├── modpack.ts           # Funções de composição
│
├── schemas/                     # JSON Schemas para validação
│   ├── recipe.schema.json
│   └── modpack.schema.json
│
└── docs/                        # Documentação adicional
    └── mod-manager-design.md
```

## 7.1 Tecnologias

| Componente     | Linguagem  | Justificativa                                      |
|----------------|------------|----------------------------------------------------|
| Executor       | Go         | Binário único, fácil distribuição, syscalls Linux  |
| Compilador     | Go         | Compartilha código com executor (internal/)        |
| Interpretador  | TypeScript | Expressividade para DSL, Deno para execução segura |

## 7.2 Comunicação entre componentes

```
┌──────────────┐      executa       ┌────────────────┐
│   Executor   │ ────────────────── │  Interpretador │
│   (modman)   │                    │  (deno run)    │
└──────┬───────┘                    └───────┬────────┘
       │                                    │
       │  passa receita raiz                │ gera receitas JSON
       ▼                                    ▼
┌──────────────────────────────────────────────────────┐
│                  /recipes/*.json                     │
└──────────────────────────────────────────────────────┘
       │
       │  compila
       ▼
┌──────────────┐
│  Compilador  │
│  (modman-    │
│   compiler)  │
└──────────────┘
```

## 7.3 Desenvolvimento

- **Go workspace**: `go.work` para gerenciar múltiplos módulos (`cmd/modman`, `cmd/modman-compiler`)
- **Testes**: TDD para cada componente (`go test`, `deno test`)
- **Nix Flake**: Ambiente reproduzível de desenvolvimento
- **CI**: Testes automatizados em cada commit
