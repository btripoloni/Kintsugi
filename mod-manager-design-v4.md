# Projeto: Mod-Manager Declarativo (v4)

## 1. Introdução e Filosofia

Este documento descreve a arquitetura refinada (v4) de um mod manager para Linux, evoluindo os conceitos da v3 para garantir **alta performance** via paralelismo e **reprodutibilidade estrita** via builds herméticos.

A filosofia "Nix-like" permanece:
-   **Declarativo:** O estado final é definido, não os passos manuais.
-   **Reproduzível:** Builds são funções puras dos inputs.
-   **Isolado:** Gerações autocontidas e imutáveis.

### 1.1. Mudanças Chave na v4
1.  **Execução em Grafo (DAG):** O script de build é tratado como um Grafo Acíclico Dirigido, permitindo execução paralela de tarefas independentes.
2.  **Fases Estritas (Fetch vs Build):** Separação total entre "baixar da internet" e "construir artefatos" para garantir hermeticidade.
3.  **Store Input-Addressed:** Caminhos do store são calculados a partir dos inputs declarados, permitindo caching agressivo antes da execução.
4.  **Escopo Fechado:** O Compositor é uma ferramenta de infraestrutura estável e não extensível. Toda a inteligência reside no gerador do script (Orquestrador).

## 2. Premissas e Modos de Execução

-   **Plataforma Alvo:** Linux (OverlayFS, Namespaces).
-   **Tecnologias Base:** Go (Compositor), TypeScript (Orquestrador), JSON (Contrato).

### 2.1. Modos de Execução
-   **`build`**: Executa o processo de construção da geração. Agora suporta flag `--jobs <N>` para limitar concorrência.
-   **`dry-run`**: Valida o grafo e calcula os hashes de input sem realizar alterações de disco.
-   **`gc`**: Coleta de lixo baseada em raízes explícitas (profiles).

## 3. Arquitetura Geral

### 3.1. O Store Input-Addressed
O Store armazena componentes imutáveis. O caminho de cada componente é derivado do hash de sua definição (inputs), não do seu conteúdo final (output).
Ex: `/store/<sha256(step-json)>-modname/`

Isso permite que o Compositor verifique se um step precisa ser executado apenas calculando o hash de sua definição JSON. Se o diretório já existe no Store, o passo é pulado instantaneamente.

### 3.2. Fases de Execução
Para garantir segurança e reprodutibilidade, o build é dividido em fases distintas:

#### Fase 1: Fetch (Com Rede)
-   **Objetivo:** Obter todos os recursos externos.
-   **Permissões:** Acesso à Rede, Escrita no Store.
-   **Operações:** `steam`, `nexus`, `url`.
-   **Validação:** Todo artefato baixado DEVE ter seu hash (SHA256) verificado contra o manifesto. Falha imediata em caso de divergência.

#### Fase 2: Build (Sem Rede)
-   **Objetivo:** Transformar e combinar artefatos.
-   **Permissões:** **Sem Acesso à Rede** (Network Namespace isolado), Leitura do Store (inputs), Escrita no Store (output).
-   **Operações:** `compose`, `run_tool`, `patch_file`.
-   **Garantia:** Como não há rede, o resultado do build depende exclusivamente dos arquivos baixados na Fase 1 e da lógica das ferramentas locais.

## 4. Estrutura do Projeto (Usuário)
Permanece similar à v3, focado em `project.json` (registries), `project.lock.json` (reprodutibilidade) e `mods.ts` (declaração).

## 5. O Contrato: O Script de Build (JSON/DAG)

O JSON descreve um DAG de operações. Cada `step` declara explicitamente suas dependências (`use_step`).

### 5.1. Primitivas do Compositor

| `op` | Fase | Descrição |
| :--- | :--- | :--- |
| **`fetch_url`** | Fetch | Baixa arquivo HTTP/HTTPS. |
| **`fetch_steam`**| Fetch | Baixa app/depot Steam via steamcmd (containerizado/isolado). |
| **`fetch_nexus`**| Fetch | Baixa mod da Nexus API. |
| **`extract`** | Build | Extrai arquivos (zip, rar, 7z) de um input anterior. |
| **`copy`** | Build | Copia/Filtra arquivos de um input para o output. |
| **`patch`** | Build | Aplica patches declarativos (JSON merge, INI set, text replace). |
| **`run_tool`** | Build | Executa binário arbitrário em sandbox (sem rede). |
| **`compose`** | Build | Cria a árvore final de symlinks (Geração). |

### 5.2. Controle de Concorrência Híbrido
O Compositor adota uma estratégia híbrida para maximizar performance sem saturar a rede:

-   **Fase Fetch (Rede):** Execução **Sequencial** (1 worker). Isso evita timeouts, rate-limiting de APIs (Nexus) e corrupção de downloads.
-   **Fase Build (CPU/IO):** Execução **Paralela**. O Compositor aceita um parâmetro de concorrência (ex: `--jobs 4`) para operações de extração, patch e composição.

O Agendador deve distinguir tipos de steps para aplicar essas regras automaticamente.

## 6. Gestão de Estado e OverlayFS do Runtime

O runtime do jogo (`mod-manager run`) usa OverlayFS:
-   **LowerDir (Read-Only):** A pasta da Geração (`/store/<hash>-generation/`).
-   **UpperDir (Read-Write):** A pasta do perfil do usuário (`~/mod-manager/profiles/<name>/data/`).
-   **WorkDir:** Necessário para o OverlayFS funcionar.

Isso garante que o jogo "veja" todos os mods instalados, mas qualquer arquivo novo (saves, logs) ou modificado (configs in-game) vá para o diretório do usuário, sem poluir o Store.

## 7. Garbage Collection

Para evitar crescimento infinito do disco:
1.  **Raízes (Roots):** Links simbólicos em `~/mod-manager/profiles/` que apontam para gerações ativas.
2.  **Mark:** O GC percorre as raízes e marca recursivamente todos os artefatos do Store referenciados por elas (direta ou indiretamente).
3.  **Sweep:** Qualquer diretório em `/store/` não marcado é deletado.

## 8. Segurança e Isolamento

-   **Sem Extensibilidade Dinâmica:** O Compositor não carrega plugins. Funcionalidades novas exigem recompilação do Compositor ou uso da primitiva genérica `run_tool` que executa binários externos isolados.
-   **Sandboxing:** O `run_tool` deve usar namespaces do Linux (user, net, mount, pid) para garantir que a ferramenta externa (ex: um patcher `.exe` rodando no Wine) não acesse a internet, não veja processos do host e só escreva no diretório de saída designado.
