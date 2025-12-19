# Referência de Operações do Compositor

Este documento detalha as primitivas (Operations) que o Compositor v4 suporta no seu grafo de execução.

> **Nota de Escopo:** Para esta versão inicial, a fase de Fetch (Resolução) suporta **apenas arquivos locais**. Suporte a Steam, Nexus e URLs externas será adicionado futuramente.

## 1. Fase Fetch (Input)

Operações que introduzem arquivos no Store a partir do mundo externo.

### `fetch_local`
Importa um arquivo ou diretório do sistema de arquivos do host para o Store.

-   **Inputs:**
    -   `path`: Caminho absoluto no host (ex: `/home/user/my-mod.zip`).
-   **Output:** Caminho no Store contendo a cópia do arquivo/dir.
-   **Comportamento:**
    1.  Lê o arquivo/diretório do host.
    2.  Calcula o hash do conteúdo (SHA256).
    3.  Armazena em `/store/<hash>-<basename>`.
    4.  Registra no DB como válido.
-   **Uso Típico:** Desenvolvimento local de mods ou instalação manual de arquivos baixados.

---

## 2. Fase Build (Transformação)

Operações que transformam artefatos existentes no Store em novos artefatos. Estas operações **não têm acesso à rede** ou ao sistema de arquivos do host (exceto o Store).

### `extract`
Descompacta arquivos de um artefato anterior.

-   **Inputs:**
    -   `source`: ID (Hash) do artefato contendo o arquivo compactado.
    -   `format`: `zip` | `rar` | `7z`.
-   **Output:** Diretório no Store com o conteúdo extraído.

### `copy`
Copia e filtra arquivos de um input para um novo output. Útil para selecionar subpastas ou renomear arquivos.

-   **Inputs:**
    -   `sources`: Lista de mapeamentos `{ source_id, source_path, dest_path }`.
-   **Output:** Novo diretório no Store contendo apenas os arquivos copiados.

### `patch`
Aplica modificações declarativas em arquivos de texto/configuração.

-   **Inputs:**
    -   `source`: Artefato original.
    -   `patches`: Lista de operações:
        -   `ini_set`: `{ file, section, key, value }`
        -   `json_merge`: `{ file, content }`
        -   `text_replace`: `{ file, old, new }`
-   **Output:** Cópia do artefato original com as modificações aplicadas.

### `run_tool`
Executa uma ferramenta binária arbitrária em um ambiente isolado (Sandbox).

-   **Inputs:**
    -   `tool`: ID do artefato contendo o executável da ferramenta.
    -   `args`: Lista de argumentos CLI.
    -   `mounts`: Lista de artefatos a serem montados no sandbox (Read-Only).
    -   `env`: Map de variáveis de ambiente.
-   **Output:** Conteúdo capturado do diretório de saída do sandbox.
-   **Segurança:** Rodado em namespace isolado (sem rede, PID único, FS restrito).

### `compose`
Gera a estrutura final de diretórios para o modpack (Geração) dentro do Store.

-   **Contexto:**
    -   Esta operação consome múltiplos artefatos (layers) e produz um **novo artefato imutável** no Store.
    -   Este artefato final representa uma "Geração" completa e versionada.
-   **Inputs:**
    -   `layers`: Lista ordenada de IDs de artefatos. A ordem importa: **Bottom -> Top**.
        -   `layers[0]` é a base (ex: arquivos vanilla do jogo).
        -   `layers[N]` sobrescreve `layers[N-1]`.
    -   `conflicts`: Estratégia de resolução de conflitos por arquivo.
        -   `overwrite` (Padrão): O arquivo da camada superior substitui silenciosamente o da inferior.
        -   `fail`: O build aborta se houver colisão de caminhos.
-   **Algoritmo de Composição:**
    1.  Cria um diretório vazio no Store (ex: `.tmp/build-xyz`).
    2.  Itera sobre `layers` do índice 0 ao N.
    3.  Para cada arquivo na layer atual:
        -   Calcula o caminho relativo.
        -   Verifica se já existe no diretório de destino.
        -   Aplica lógica `conflicts` (sobrescreve symlink ou erro).
        -   Cria symlink no destino apontando para o arquivo original no Store (deduplication).
-   **Output:** Caminho absoluto no Store (ex: `/store/<hash>-my-modpack-v1`).
-   **Pós-Processamento:**
    -   O Orquestrador cria um symlink global (Profile) apontando para este output: `~/.local/state/mod-manager/profiles/<project-name>/<generation-id>`.
    -   Isso permite rollback instantâneo trocando o symlink do Profile.
