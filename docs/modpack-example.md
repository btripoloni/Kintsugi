# Exemplo de Modpack: Pseudocódigo

Este documento apresenta um exemplo de pseudocódigo para a criação de um modpack do Skyrim usando Kintsugi. O objetivo é demonstrar como as funções `mkShard` e a biblioteca `sources` se unem para definir um conjunto de mods e suas dependências.

## 1. Estrutura do Arquivo `modpack.ts`

O coração de um modpack Kintsugi é o arquivo `modpack.ts` (ou `main.ts`), que serve como o ponto de entrada para o interpretador.

```typescript
// modpack.ts
import { mkShard, mkBuild, bootstrap, sources } from "kintsugi";

// --- Definição dos Shards Base ---

// O jogo base, puxado de um Vase
const skyrim = await mkShard({
  name: "skyrim-se",
  version: "1.6.117",
  src: sources.fetch_vase({ vase: "skyrim-se-1.6.117" }),
});

// SKSE, baixado da web
const skse = await mkShard({
  name: "skse",
  version: "2.0.65",
  src: sources.fetch_url({
    url: "https://skse.silverlock.org/beta/skse64_2_06_05.7z",
    sha256: "...",
    unpack: true,
  }),
  dependencies: [skyrim],
});

// --- Definição de Mods ---

// Um mod simples de armadura
const immersiveArmors = await mkShard({
  name: "immersive-armors",
  version: "8.1",
  src: sources.fetch_url({
    url: "https://example.com/immersive_armors.zip",
    sha256: "...",
    unpack: true,
  }),
  dependencies: [skyrim],
  postBuild: `
    # Exemplo de script post-build para limpar arquivos
    rm -rf "optional-patches/"
  `,
});

// Um mod local que você mesmo criou
const myPrivateMod = await mkShard({
  name: "my-private-mod",
  version: "1.0.0",
  src: sources.fetch_local({
    path: "./local-mods/my-mod-folder",
  }),
  dependencies: [skyrim],
});

// --- Geração de Arquivos de Configuração ---

const skyrimIni = await mkShard({
  name: "skyrim-ini-config",
  version: "1.0.0",
  src: sources.write_text({
    path: "Skyrim.ini",
    content: `
      [General]
      sLanguage=PORTUGUESE
      uGridsToLoad=5
    `,
  }),
});

// --- Geração de Patches (Exemplo com Nemesis) ---

const nemesisEngine = await mkShard({ ... }); // Definição do Nemesis
const animationMod1 = await mkShard({ ... }); // Mod de animação 1
const animationMod2 = await mkShard({ ... }); // Mod de animação 2

const nemesisEnv = await mkShard({
  name: "nemesis-generator-env",
  version: "1.0.0",
  dependencies: [skyrim, skse, nemesisEngine, animationMod1, animationMod2],
});

const nemesisOutput = await mkShard({
  name: "nemesis-output",
  version: "1.0.0",
  src: sources.run_in_build({
    build: nemesisEnv,
    command: {
      entrypoint: "Nemesis Unlimited Behavior Engine.exe",
      args: ["-update"],
    },
    outputs: ["nemesis_engine/output/**"],
  }),
});


// --- Build Final ---

// A build final que será usada para rodar o jogo
const finalBuild = await mkBuild({
  name: "my-skyrim-modpack",
  layers: [
    skyrim,
    skse,
    immersiveArmors,
    myPrivateMod,
    skyrimIni,
    nemesisOutput,
  ],
});


// --- Bootstrap ---

// Exporta a build final para que o Kintsugi possa executá-la
bootstrap(finalBuild);
```

## 2. Conceitos Demonstrados

-   **Modularidade**: Cada mod, patch ou configuração é um `Shard` independente.
-   **Fontes Diversificadas**: O exemplo usa `fetch_vase`, `fetch_url`, `fetch_local`, e `write_text` para mostrar a flexibilidade do sistema de fontes.
-   **Dependências**: Os mods declaram dependências claras (ex: `skse` depende de `skyrim`).
-   **Build em Camadas**: A `finalBuild` é uma composição de todos os outros shards, demonstrando o sistema de camadas do Kintsugi.
-   **Geração de Conteúdo**: `run_in_build` é usado para um cenário avançado de geração de patches.

Este exemplo é uma base que pode ser expandida para modpacks de qualquer tamanho e complexidade. A chave é a capacidade de compor pequenos blocos de construção (`Shards`) para criar um resultado final coeso e reproduzível.
