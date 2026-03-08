# Fluxo de Execução (Run Workflow)

Este documento descreve como o Kintsugi prepara e executa o ambiente de um modlist. O objetivo é garantir que o jogo rode a partir de uma "composição" imutável no `/store`, mas com a capacidade de salvar arquivos, logs e configurações de forma persistente e isolada.

A arquitetura de execução do Kintsugi é construída sobre três pilares:

1.  **Artefatos de Execução (`run specs`)**: Arquivos de manifesto (`.run.json`) localizados em `kintsugi/exec/` dentro de cada composição, descrevendo *como* executá-la.
2.  **Sistema de Arquivos em Camadas (OverlayFS)**: Para permitir escrita em um ambiente imutável.
3.  **Isolamento de Ambiente (Namespaces)**: Para garantir que a execução não interfira no sistema do usuário.

## 1. Os Artefatos de Execução

Os parâmetros de execução (`entrypoint`, `umu`, etc.) são encapsulados em arquivos de manifesto dentro da própria composição, em uma pasta dedicada.

Isso desacopla a *definição do que construir* da *definição de como executar* e permite múltiplos perfis de execução.

### A Source `write_run_spec`

Para gerar estes manifestos, utilizamos uma `Shard` com `source` json com o conteudo:

Cria um manifesto de execução (`.run.json`) como um Shard. Este manifesto define como executar a composição, permitindo múltiplos perfis (ex: `default`, `editor`). O arquivo será sempre criado em `kintsugi/exec/[name].run.json`.

**Parâmetros:**
| Nome | Tipo | Observação |
| ---  | --- | --- |
| name | string | Nome do perfil de execução (ex: `"default"`, `"editor"`). O arquivo será criado em `kintsugi/exec/ |
| entrypoint | string | O executável a ser iniciado. |
| umu? | umu | Configuração para execução via UMU (Proton/Wine), opcional, nem todos os jogos precisam do umu |
| args? | string[] | Argumentos de linha de comando para o executável | 
| env? | string, string | Variáveis de ambiente adicionais. |

**umu** 
| Nome | Tipo | Observação |
| ---  | --- | --- |
| id | string | (opcional)O AppID do Steam. |
| version | string | (opcional)A versão do UMU a ser usada. |

**Exemplo de uso:**

```text
Shard:
  source(json):
    path: 'kintsugi/exec/default.json'
    content:
      name: "default" // O arquivo será criado em kintsugi/exec/default.run.json
      entrypoint: "skse64_loader.exe"
      umu: {
        version: "GE-Proton9-4"
        id: "489830" // AppID do Skyrim SE
      }
      args: ["-high"]
```

Durante a fase de *realization*, o Kintsugi criará os seguintes arquivos dentro da composição no `/store`:

**`/store/[hash]-composition/kintsugi/exec/default.run.json`**:
```json
{
    "entrypoint": "skse64_loader.exe",
    "umu": { "version": "GE-Proton9-4", "id": "489830" },
    "args": ["-high"],
    "env": {}
}
```

Essa abordagem garante que toda composição seja autossuficiente e possa ser executada de diferentes maneiras.

## 2. Preparação do Ambiente (OverlayFS)

Para permitir que um jogo escreva arquivos sem alterar a composição original, o Executor utiliza o **OverlayFS** do Linux.
**fuse-overlayfs** para fazer uma execussão non-root

### Camadas do Overlay:

- **Lower Layer (Composition/Store)**: O diretório imutável da composição ativa, contendo todos os mods, o jogo e a pasta `kintsugi/exec/`. Esta camada é somente leitura.
- **Upper Layer (modlist Data)**: Pasta específica do modlist (ex: `~/.kintsugi/modlists/<nome>/upperlayer`). Todos os novos arquivos e modificações em tempo de execução são salvos aqui.
- **Work Layer**: Pasta interna necessária para o funcionamento do OverlayFS.
- **Merged Layer (Runtime View)**: O ponto de montagem final onde o jogo "enxerga" a união da composição com os seus dados persistentes.

### Estrutura de Pastas Gerenciada:

```
~/.kintsugi/modlists/<nome>/
├── active -> /store/[hash]-composition/ (Link simbólico para a composição atual)
├── upperlayer/ (Persistência: saves, configs, logs)
├── worklayer/  (Interno do OverlayFS)
├── merged/     (Ponto de montagem final - visível apenas dentro do namespace)
└── prefix/     (Opcional: Pasta persistente para o Wine/Proton)
```

## 3. Isolamento via Namespaces

Para garantir que o ambiente de execução seja limpo e não interfira no sistema do usuário, o Kintsugi utiliza Namespaces do Linux para criar um ambiente de montagem isolado. Isso permite realizar montagens (como o fuse-overlayfs) sem precisar de privilégios de `root` no sistema host.

Importante, UMU não será usado nos namespaces, ele já cria um ambiente isolado para se proprio.

## 4. Workflow do Comando `run`

O comando para rodar uma build é `kintsugi run [modlist name] [perfil]`

1.  **Identificar Composição Ativa**: O executor localiza o modlist e resolve o link simbólico `active` para encontrar o caminho da composição no `/store`.
2.  **Resolver Perfil de Execução**:
    - O executor combina o nome do perfil fornecido (ou `default` se nenhum for) com o caminho base: `kintsugi/exec/[perfil].run.json`.
    - Exemplo: `kintsugi run [modpaack] editor` tentará localizar `kintsugi/exec/editor.run.json`.
    - Exemplo: `kintsugi run` tentará localizar `kintsugi/exec/default.run.json`.
3.  **Localizar Manifesto**: O executor procura pelo arquivo de manifesto resolvido na raiz da composição ativa (via `merged` layer). Se não encontrar, o comando falha.
4.  **Montar Overlay**: O `mount -t overlay` é executado dentro de um namespace isolado.
5.  **Ler Manifesto**: O conteúdo do `.run.json` encontrado é lido para obter `entrypoint`, `umu`, `args` e `env`.
6.  **Executar**:
    - Se o objeto `umu` estiver presente no manifesto, o `entrypoint` é executado via `umu-run`.
    - Se `umu` estiver ausente, o `entrypoint` é executado de forma nativa.
7.  **Aguardar e Limpar**: O executor aguarda o processo do jogo finalizar e, ao término, destrói o namespace de montagem.

## 5. Estratégias de Execução

### A. Nativo (Linux)
- O Executor monta o Overlay e executa o binário definido no `entrypoint` diretamente.
- O diretório de trabalho (`CWD`) é a raiz da pasta `merged`.

### B. UMU (Windows via Wine/Proton)
- O Executor utiliza o **UMU-Launcher** para compatibilidade.
- O diretório `prefix` (`~/.kintsugi/modlists/<nome>/prefix`) é usado como `WINEPREFIX`, garantindo que o ambiente Wine seja persistente entre atualizações da composição.

### Variáveis de Ambiente Exportadas

O Executor continua a exportar variáveis úteis para o processo do jogo:
- `KINTSUGI_ROOT`: Caminho absoluto para a pasta `merged`.
- `KINTSUGI_modlist_NAME`: Nome do modlist sendo executado.
- `KINTSUGI_BUILD_HASH`: O hash da composição ativa.