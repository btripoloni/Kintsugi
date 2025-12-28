# Biblioteca `sources`

A biblioteca `sources` é um conjunto de funções auxiliares projetadas para serem usadas com `mkShard` para definir a propriedade `src` de um shard. Cada função nesta biblioteca é especializada em adquirir ou gerar conteúdo de uma maneira específica, oferecendo uma API clara e consistente para a construção de shards.

---

## Funções de Aquisição

### `sources.fetch_url`

Baixa um arquivo ou pacote de uma URL remota.

-   **Parâmetros:**
    -   `url: string`: A URL para o download.
    -   `sha256: string`: O hash de integridade SHA256 esperado.
    -   `unpack?: boolean`: Descompacta o arquivo automaticamente (se for `.zip`, `.tar`, etc.).
    -   `method?: "GET" | "POST"`
    -   `headers?: Record<string, string>`
    -   `cookies?: Record<string, string>`
    -   `body?: string`
-   **Exemplo:**
    ```typescript
    const skse = await mkShard({
      name: "skse",
      version: "2.0.65",
      src: sources.fetch_url({
          url: "https://skse.silverlock.org/beta/skse64_2_06_05.7z",
          sha256: "e3b0c442...",
          unpack: true,
      }),
    });
    ```

### `sources.fetch_local`

Importa arquivos ou diretórios do sistema de arquivos local.

-   **Parâmetros:**
    -   `path: string`: Caminho para o arquivo ou diretório, relativo à raiz do modpack.
    -   `exclude?: string[]`: Padrões glob para ignorar arquivos.
-   **Exemplo:**
    ```typescript
    const meuModLocal = await mkShard({
      name: "meu-mod-local",
      version: "1.0.0",
      src: sources.fetch_local({
          path: "./mods/meu-mod",
          exclude: ["*.tmp"],
      }),
    });
    ```

### `sources.fetch_vase`

Importa conteúdo de uma coleção global [Vase](./vases.md).

-   **Parâmetros:**
    -   `vase: string`: O nome do Vase registrado (ex: `"skyrim-assets"`).
-   **Exemplo:**
    ```typescript
    const jogoBase = await mkShard({
      name: "skyrim-se",
      version: "1.6.117",
      src: sources.fetch_vase({
          vase: "skyrim-se-1.6.117",
      }),
    });
    ```

---

## Funções de Geração

### `sources.write_text`

Cria um arquivo de texto simples no diretório do shard.

-   **Parâmetros:**
    -   `path: string`: Nome do arquivo a ser criado (ex: `"skyrim.ini"`).
    -   `content: string`: O conteúdo do arquivo de texto.
-   **Exemplo:**
    ```typescript
    const introMessage = await mkShard({
      name: "intro-message",
      version: "1.0.0",
      src: sources.write_text({
          path: "boas_vindas.txt",
          content: "Bem-vindo ao meu modpack!",
      }),
    });
    ```

### `sources.write_json` / `sources.write_toml`

Serializa um objeto JavaScript para um arquivo `.json` ou `.toml`.

-   **Parâmetros:**
    -   `path: string`: Nome do arquivo (ex: `"config.json"`).
    -   `content: any`: Objeto serializável.
-   **Exemplo:**
    ```typescript
    const modConfig = await mkShard({
      name: "meu-mod-config",
      version: "1.0.0",
      src: sources.write_json({
          path: "MCM/Settings/MeuMod.json",
          content: {
              dificuldade: "dificil",
              ativarDragons: true,
          },
      }),
    });
    ```

---

## Geração Avançada

### `sources.run_in_build`

Executa uma ferramenta externa em um ambiente isolado e captura os arquivos gerados como a fonte do shard.

-   **Parâmetros:**
    -   `build: Shard`: A composição que servirá de ambiente de execução.
    -   `command`: O comando a ser executado.
    -   `outputs: string[]`: Padrões glob para capturar os arquivos de saída.
-   **Exemplo:**
    ```typescript
    const nemesisEnv = await mkComposition({
        name: "nemesis-generator-env",
        layers: [skyrim, skse, nemesisEngine, animationMod1],
    });

    const nemesisOutput = await mkShard({
        name: "nemesis-output",
        version: "1.0.0",
        src: sources.run_in_build({
            build: nemesisEnv,
            command: {
                entrypoint: "Nemesis Unlimited Behavior Engine.exe",
                args: ["-update"],
                umu: { version: "GE-Proton9-4", id: "489830" }
            },
            outputs: ["nemesis_engine/output/**"]
        }),
    });
    ```
---

## Funções de Geração de Execução

Estas são funções auxiliares que geram Shards completos, contendo metadados para a execução do modpack. Elas devem ser usadas diretamente na lista de `layers` de uma `mkComposition`.

### `writeRunSpec`

Cria um manifesto de execução (`.run.json`) como um Shard. Este manifesto define como executar a composição, permitindo múltiplos perfis (ex: `default`, `editor`).

-   **Parâmetros:**
    -   `path: string`: Caminho do arquivo de manifesto (ex: `"kintsugi/exec/default.run.json"`).
    -   `entrypoint: string`: O executável a ser iniciado.
    -   `umu?: object`: Configuração para execução via UMU (Proton/Wine).
        -   `id: string`: O AppID do Steam.
        -   `version: string`: A versão do UMU a ser usada.
    -   `args?: string[]`: Argumentos de linha de comando para o executável.
    -   `env?: Record<string, string>`: Variáveis de ambiente adicionais.
-   **Exemplo:**
    ```typescript
    const minhaComposicao = await mkComposition({
        name: "meu-modpack-executavel",
        layers: [
            skyrim,
            skse,
            writeRunSpec({
                path: "kintsugi/exec/default.run.json",
                entrypoint: "skse64_loader.exe",
                umu: { version: "GE-Proton9-4", id: "489830" },
            }),
        ],
    });
    ```
