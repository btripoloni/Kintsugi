# Projeto: Mod-Manager Declarativo (v3)

## 1. Introdução e Filosofia

Este documento descreve a arquitetura de um mod manager para Linux, com inspiração fundamental nos princípios do [Nix](https://nixos.org/). O objetivo é criar uma ferramenta que permita a construção de modpacks de forma **declarativa**, **reproduzível** e **isolada**.

A filosofia central é tratar a configuração de um modpack não como uma sequência de passos manuais, mas como a definição de um estado final desejado. O sistema então se encarrega de construir esse estado de forma determinística.

-   **Declarativo:** O usuário descreve *o que* quer no modpack (quais mods, quais configurações), não *como* instalar.
-   **Reproduzível:** Um mesmo arquivo de configuração de modpack, em qualquer máquina, sempre produzirá um resultado idêntico, bit a bit. Isso é garantido travando as versões de todas as dependências (jogo, mods, ferramentas).
-   **Isolado:** Cada build de um modpack é uma "geração" autocontida, que não interfere com os arquivos originais do jogo nem com outros modpacks. Múltiplas configurações de mods para o mesmo jogo podem coexistir sem conflitos.

## 2. Premissas e Modos de Execução

-   **Plataforma Alvo:** Exclusivamente **Linux**. Isso nos permite usar tecnologias nativas do kernel, como o **OverlayFS**.
-   **Tecnologias Base:** Go (Compositor), TypeScript (Orquestrador), JSON (Contrato).

### 2.1. Modos de Execução
-   **`build`**: O modo padrão, que executa o script JSON e constrói a geração.
-   **`dry-run`**: Um modo de simulação que valida o script JSON e imprime os passos que seriam executados, sem tocar no sistema de arquivos. Essencial para depuração.
-   **`update`**: Um modo para gerenciar atualizações de dependências (detalhado na Seção 9).

## 3. Arquitetura Geral

O sistema é dividido em duas partes: o **Orquestrador (TypeScript)**, que possui a lógica de alto nível e gera um script JSON; e o **Compositor (Go)**, um interpretador genérico e agnóstico de jogos que executa as operações descritas no script.

### 3.1. O Store

O **Store** (ex: `.mod-manager/store`) é um diretório onde todos os componentes (jogo, mods, arquivos gerados) são armazenados de forma **imutável**. Cada componente é resolvido para um caminho único baseado no hash de seu conteúdo (ex: `/store/<hash>-skyui-5.2/`). A imutabilidade do Store garante builds livres de efeitos colaterais e permite que um mesmo mod, usado em dez modpacks, ocupe espaço em disco apenas uma vez.

**Garbage Collection:** Para gerenciar o tamanho do Store, o sistema implementará um comando `mod-manager collect-garbage`, que removerá todos os dados do Store que não são referenciados por nenhuma geração existente, de forma similar ao `nix-collect-garbage`. Stores por-projeto podem ser uma opção futura para isolamento extra.

### 3.2. Builds Isolados (Gerações)

Uma **Geração** é o resultado de um build: um diretório autocontido e jogável, construído primariamente com **links simbólicos** que apontam para os caminhos corretos dentro do Store. O sistema pode gerenciar múltiplas gerações, permitindo ao usuário alternar entre elas instantaneamente.

## 4. Estrutura do Projeto do Usuário

-   `project.json`: Define as dependências externas (registries). **Obrigatório.**
-   `project.lock.json`: Trava os commits exatos das dependências para garantir reprodutibilidade. **Obrigatório e gerenciado pela ferramenta.**
-   `mods.ts`: Ponto de entrada onde o usuário declara o modpack.
-   `package.json` / `yarn.lock`: Opcional, para gerenciar dependências NPM/Yarn do próprio `mods.ts`, permitindo o uso de bibliotecas externas no Orquestrador.

## 5. O Contrato: O Script de Build (JSON)

O JSON é um programa para o Compositor, contendo uma lista de `steps` a serem executados em ordem.

### 5.1. Primitivas do Compositor (Operações `op`)

| `op` | Descrição |
| :--- | :--- |
| **`resolve`** | Resolve uma `derivation`, populando o Store. |
| **`compose`** | Monta a geração final com links simbólicos a partir de `layers`. <br> *Otimizações:* A implementação pode usar caching de metadados ou hardlinks como fallback para otimizar a performance em builds muito grandes. |
| **`create_file`** | Cria um arquivo com conteúdo específico. |
| **`copy`** | Copia fisicamente um arquivo/pasta de uma fonte resolvida. |
| **`create_dir`** | Garante que um diretório exista. |
| **`patch_file`** | Modifica um arquivo de forma declarativa (`ini_merge`, `json_patch`). |
| **`run_tool`** | Executa uma ferramenta externa em um ambiente OverlayFS isolado e captura os arquivos gerados. <br> *Parâmetros Adicionais:* `tool.runtime` (ex: `"proton-ge-8"`) para executar dentro de um ambiente Wine/Proton. |
| **`verify_signature`** | Verifica a assinatura digital de um arquivo, falhando o build se inválida. |
| **`log`** | Imprime uma mensagem customizada no log do build. Útil para depuração pelo autor do pacote. |

### 5.2. Tipos de Derivação (`derivation`)

Toda derivação **deve** incluir um campo `hash` (SHA256) para garantir a integridade do arquivo. A ferramenta deve auxiliar na geração deste hash no primeiro download.

| `type` | Descrição |
| :--- | :--- |
| **`steam`** | Baixa um jogo/app da Steam. |
| **`nexus`** | Baixa um mod da Nexus Mods. |
| **`url`** | Baixa um arquivo de qualquer URL. |
| **`local_file`** | Usa um arquivo/pasta do sistema local. |
| **`generated-ini`**| Gera um arquivo `.ini`. |
| **`curseforge`** | (Exemplo de Extensão) Baixa um mod do CurseForge. |
| **`github_release`**| (Exemplo de Extensão) Baixa um artefato de um release do GitHub. |

**Extensibilidade Futura:** O sistema poderá se tornar plugável, permitindo que registries definam seus próprios tipos de `derivation` customizados (ex: via WASM), tornando a ferramenta verdadeiramente extensível.

## 6. Gestão de Estado e Uso Estratégico do OverlayFS

-   **Build da Geração (Links Simbólicos):** A operação `compose` cria a Geração usando majoritariamente **links simbólicos** para o Store. É o método primário, sendo rápido e eficiente.
-   **Execução do Jogo (Runtime OverlayFS):** Ao rodar o jogo (`mod-manager run`), um OverlayFS é montado com a Geração como `lowerdir` (read-only) e uma pasta de perfil como `upperdir`, capturando saves e alterações de config.
-   **Execução de Ferramentas (`run_tool` OverlayFS):** O OverlayFS é usado para criar um ambiente de build temporário e isolado para capturar os artefatos gerados por ferramentas.

## 7. Gestão de Segurança

-   **Integridade:** A obrigatoriedade de hashes em todas as derivações previne a corrupção de dados. A primitiva `verify_signature` adiciona uma camada extra de segurança para mods assinados.
-   **Credenciais:** Credenciais sensíveis (chaves de API, logins) **não devem** ser armazenadas nos arquivos de configuração. O Compositor deverá lê-las de **variáveis de ambiente** ou de um cofre de senhas do sistema (como `pass` ou `gnome-keyring`). Suporte a fluxos OAuth2 (via browser) para plataformas como Nexus é um objetivo.

## 8. Comandos da CLI (Interface de Usuário)

-   `mod-manager build`: Constrói uma nova geração.
-   `mod-manager run <geração>`: Executa uma geração.
-   `mod-manager update`: Escaneia os registries por novas versões de dependências (respeitando o `project.lock.json`), informa o usuário sobre as atualizações disponíveis e oferece a opção de atualizar o arquivo de lock. Permitirá "pinning" de versões.
-   `mod-manager collect-garbage`: Executa a limpeza do Store.

## 9. Estratégia de Testes

-   **Testes Unitários:** Cada primitiva do Compositor (Go) e função auxiliar do Orquestrador (TS) deve ser testada isoladamente (ex: usando mocks para downloads).
-   **Testes de Integração:** Testar o fluxo completo `TS -> JSON -> Go` para cada primitiva.
-   **Testes End-to-End (E2E):** Criar builds completos de modpacks para jogos open-source (ex: Minetest) para validar cenários reais.
-   **CI/CD:** Usar um pipeline de integração contínua para rodar todos os testes e validar a reprodutibilidade dos builds de exemplo em diferentes distribuições Linux (ex: Ubuntu, Arch Linux).

## 10. Documentação e Exemplos

-   **Documentação do Projeto:** O documento de design deve ser mantido e evoluir junto com o código.
-   **Repositório de Exemplos:** Um repositório separado ou um diretório no projeto principal conterá exemplos de `mods.ts` para diferentes jogos, demonstrando desde configurações simples até casos complexos com `run_tool` e resolução de conflitos.
-   **Documentação de API:** A documentação das primitivas e tipos de derivação deve ser completa e acessível aos usuários que desejam criar seus próprios pacotes.
