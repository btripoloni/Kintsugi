# Arquitetura Interna do Compositor

Este documento detalha os componentes internos, fluxo de dados e comportamento do **Compositor**, o executável Go responsável por materializar o modpack.

## 1. Visão Geral

O Compositor opera como uma pipeline de transformação de dados:
`JSON Spec` -> **Compositor** -> `Store Entries` + `Symlink Tree`.

### Princípios de Design
-   **Stateless (quase):** O único estado persistente é o diretório Store e o Cache de metadados.
-   **Fail-Fast:** Qualquer erro (hash inválido, falha de rede) aborta o processo imediatamente.
-   **Isolated:** Zero confiança em variáveis de ambiente global ou ferramentas instaladas no host (exceto as essenciais como `unshare`, `mount`).

## 2. Diagrama de Componentes

```mermaid
graph TD
    CLI[CLI Entrypoint] --> Loader[Spec Loader]
    Loader --> Graph[DAG Builder]
    Graph --> Scheduler[Scheduler]
    
    subgraph "Execution Engine"
        Scheduler --> NetQ[Network Queue (Serial)]
        Scheduler --> CpuQ[Compute Queue (Parallel)]
        
        NetQ --> Fetcher[Fetch Worker]
        CpuQ --> Builder[Build Worker]
        
        Fetcher -- "Write/Verify" --> Store[Store Manager]
        Builder -- "Read/Write" --> Store
        Builder -- "Execute" --> Sandbox[Sandbox Runtime]
    end
    
    Store --> Disk[(Filesystem)]
    Store --> DB[(SQLite Meta-DB)]
```

## 3. Detalhamento dos Componentes

### 3.1. Spec Loader & DAG Builder
Responsável pelo parsing inicial.
-   **Schema Validation:** Valida o JSON de entrada contra um Schema rigoroso.
-   **Input Hashing:** Para cada step, calcula um hash SHA256 determinístico baseado em seus campos e nos hashes de suas dependências. Este hash se torna o ID do objeto no Store.
-   **Graph Construction:** Converte a lista plana de steps em um grafo, resolvendo ponteiros e detectando ciclos.

### 3.2. Scheduler (O Maestro)
Gerencia o ciclo de vida da execução.
-   **Estado:** Mantém uma tabela de `StepID -> Status (Pending, Running, Done, Failed)`.
-   **Dispatch:** Monitora o `in-degree` dos steps. Quando um step tem todas as dependências satisfeitas (`Done`), ele é despachado.
-   **Backpressure:** Controla quantas goroutines rodam simultaneamente usando semáforos/pools.

### 3.3. Store Manager & Database
Gerencia o acesso ao `/store` e seus metadados.
-   **Local Database (SQLite):** Inspirado no Nix, usamos um banco SQLite local (ex: `/var/lib/mod-manager/db.sqlite`) para rastrear:
    -   **Valid Paths:** Quais caminhos no Store são válidos e completos.
    -   **Derivations:** Mapeamento `InputHash -> StorePath`. Permite queries rápidas de existência sem checar o disco.
    -   **References:** Grafo de dependência entre artefatos (`A` depende de `B`). Essencial para o Garbage Collector saber o que pode apagar.
-   **Atomic Writes:** Garante que entradas parciais nunca conrrompam o store.
    1.  Cria diretório temporário `.tmp/<uuid>`.
    2.  Worker escreve arquivos lá.
    3.  Store Manager verifica Hash final.
    4.  **Transaction:** Renomeia para `/store/<hash>-name` E insere registro de validade no SQLite atomicamente.
-   **Cache Check:** Verifica tabela `ValidPaths` e `Derivations` antes de despachar jobs.

### 3.4. Sandbox Runtime (O Carcereiro)
Isola a execução de ferramentas externas (`run_tool`).
-   **Tecnologia:** Linux Namespaces (`syscall.Unshare`).
-   **Configuração Padrão:**
    -   `CLONE_NEWNET`: Sem interfaces de rede (apenas loopback isolado).
    -   `CLONE_NEWNS`: Mount namespace privado.
    -   `CLONE_NEWPID`: Process isolation.
-   **Filesystem View:**
    -   Monta dependências do Store como `READ-ONLY` dentro do sandbox via OverlayFS ou Bind Mounts.
    -   Diretório de saída montado como `READ-WRITE`.
    -   `/tmp` limpo e privado.

## 4. Interfaces Internas (Go)

```go
// Representa uma ação atômica (Fetch, Extract, Run, etc)
type Operator interface {
    Execute(ctx context.Context, inputs InputMap, outputDir string) error
    Type() OpType // Network or Compute
}

// Gerencia o armazenamento físico
type Store interface {
    // Retorna true se o artefato já existe
    Has(hash string) bool
    // Prepara um diretório para escrita e commita ao final se sucesso
    Write(hash string, writer func(dir string) error) error
    // Retorna caminho de leitura
    Path(hash string) string
}

// Abstração de isolamento
type Sandbox interface {
    Run(cmd []string, env []string, mounts []Mount) error
}
```

## 5. Fluxo de Execução (Happy Path)

1.  **Init:** CLI carrega `build.json`, valida e computa hashes.
2.  **Check:** Scheduler verifica quais steps já estão no Store e marca como `Done`.
3.  **Fetch (Serial):** Scheduler identifica steps de download pendentes. Envia 1 por 1 para o `NetQueue`.
    -   Worker baixa -> valida checksum -> Store commit.
4.  **Build (Parallel):** Conforme downloads terminam, steps de extração/compilação ficam prontos.
    -   Scheduler envia N (ex: 4) para `CpuQueue`.
    -   Workers preparam Sandbox -> Executam -> Store commit.
5.  **Finalize:** Último step (`compose`) cria symlinks finais no diretório de saída do usuário.
